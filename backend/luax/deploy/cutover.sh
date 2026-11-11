# Usage: MODE=rehearsal|production RELEASE=<dir> bash cutover.sh   (archive at /tmp/openmun-release.tgz)
set -euo pipefail
umask 077
MODE=${MODE:?}
TS=$(date -u +%Y%m%dT%H%M%SZ)
ROOT=/home/ubuntu/openMUN/releases
REL=$ROOT/${RELEASE:?}
PG="docker exec -u postgres openmun-postgres psql -v ON_ERROR_STOP=1 -U openmun_admin"
mkdir -p /home/ubuntu/openmun-backups
BACKUP=$(mktemp -d /home/ubuntu/openmun-backups/cutover-$MODE.XXXXXXXX)
log() { printf '[%s] %s\n' "$(date -u +%T)" "$*"; }

if [ "$MODE" = production ]; then DB=openmun; PORT=3005; NAME=openmun-backend; else DB=openmun_rehearsal_${TS,,}; PORT=3007; NAME=openmun-rehearsal; fi

if [ ! -d "$REL" ]; then
  log "building release $REL"
  mkdir -p "$REL"
  cp -a $ROOT/candidate.Nh8VJgTV/node_modules "$REL/"
  tar -xzf /tmp/openmun-release.tgz -C "$REL"
fi
grep -vE '^(PORT|DB_NAME|ALLOWED_ORIGINS)=' $ROOT/candidate.Nh8VJgTV/.env > "$REL/.env"
printf 'PORT=%s\nDB_NAME=%s\nALLOWED_ORIGINS=https://openmun.app,https://www.openmun.app,https://pruebas.openmun.app\n' "$PORT" "$DB" >> "$REL/.env"
chmod 600 "$REL/.env"

if [ "$MODE" = production ]; then
  log "freezing legacy writes"
  pm2 stop comites-app >/dev/null
  sleep 1
  if curl -s -o /dev/null --max-time 2 http://127.0.0.1:3000/; then echo "legacy still answering"; exit 1; fi
fi

log "SQLite backup -> $BACKUP"
python3 - "$BACKUP/legacy.sqlite" <<'PY'
import sqlite3, sys
from contextlib import closing
with closing(sqlite3.connect("file:/home/ubuntu/comites/data/openmun.db?mode=ro", uri=True)) as s, closing(sqlite3.connect(sys.argv[1])) as b:
    s.backup(b)
    assert b.execute("PRAGMA integrity_check").fetchall() == [("ok",)]
    assert b.execute("PRAGMA foreign_key_check").fetchone() is None
    for t in ("conferencias","comites","avisos","checklist_staff"):
        print(t, b.execute(f"select count(*) from {t}").fetchone()[0])
PY

if [ "$MODE" = production ]; then
  log "pg_dump current $DB"
  docker exec -u postgres openmun-postgres pg_dump -U openmun_admin -d openmun -Fc > "$BACKUP/postgres-before.dump"
  log "stopping previous new-backend releases"
  pm2 delete openmun-backend >/dev/null 2>&1 || true
  pm2 stop openmun-candidate >/dev/null 2>&1 || true
  $PG -d postgres -c "ALTER DATABASE openmun RENAME TO openmun_pre_cutover_${TS,,}"
fi
(cd "$BACKUP" && sha256sum * > SHA256SUMS)

log "creating $DB"
$PG -d postgres -c "CREATE DATABASE $DB OWNER openmun_admin" -c "REVOKE ALL ON DATABASE $DB FROM PUBLIC" -c "GRANT CONNECT ON DATABASE $DB TO openmun_app"

cd "$REL"
set -a; . ./.env; set +a
export MIGRATION_DB_USER=openmun_admin
export MIGRATION_DB_PASSWORD=$(grep -E '^DB_PASSWORD=' /home/ubuntu/openMUN/.env | cut -d= -f2-)
log "migrating"
node src/db/migrate.js
docker exec -i -u postgres openmun-postgres psql -v ON_ERROR_STOP=1 -U openmun_admin -d "$DB" < src/db/app-grants.sql
log "importing (twice, second must be a no-op)"
node src/db/import-sqlite.js "$BACKUP/legacy.sqlite"
node src/db/import-sqlite.js "$BACKUP/legacy.sqlite"
$PG -d "$DB" -Atc "select 'conferencias', count(*) from conferencias union all select 'comites', count(*) from comites union all select 'checklist', count(*) from checklist_staff union all select 'schema', max(version) from openmun_schema_versions"

log "starting $NAME on $PORT"
pm2 delete "$NAME" >/dev/null 2>&1 || true
env -i PATH="$PATH" HOME="$HOME" NODE_ENV=production HOST=127.0.0.1 PORT="$PORT" \
  pm2 start "$REL/server.js" --name "$NAME" --cwd "$REL" --kill-timeout 20000 --max-memory-restart 1G --restart-delay 2000 >/dev/null
for i in $(seq 1 20); do curl -fsS "http://127.0.0.1:$PORT/readyz" && break; sleep 1; done; echo
ss -ltn | grep ":$PORT "

if [ "$MODE" = production ]; then
  log "switching nginx"
  CONF=/etc/nginx/sites-enabled/default
  sudo cp "$CONF" "$BACKUP/nginx-default.conf"
  curl -fsS https://www.cloudflare.com/ips-v4 > "$BACKUP/cf4"; curl -fsS https://www.cloudflare.com/ips-v6 > "$BACKUP/cf6"
  { while read -r ip; do [ -n "$ip" ] && echo "set_real_ip_from $ip;"; done < <(cat "$BACKUP/cf4"; echo; cat "$BACKUP/cf6"); echo "real_ip_header CF-Connecting-IP;"; } | sudo tee /etc/nginx/conf.d/cloudflare-realip.conf >/dev/null
  sudo python3 - "$CONF" <<'PY'
import sys, re
p = sys.argv[1]; s = open(p).read()
s = s.replace("proxy_pass http://localhost:3000;", "proxy_pass http://127.0.0.1:3005;", 1)
if "X-Forwarded-For" not in s:
    s = s.replace("proxy_set_header Host $host;", "proxy_set_header Host $host;\n        proxy_set_header X-Forwarded-For $remote_addr;\n        proxy_set_header X-Forwarded-Proto https;\n        proxy_read_timeout 120s;", 1)
open(p, "w").write(s)
PY
  sudo nginx -t
  sudo systemctl reload nginx
  pm2 save >/dev/null
fi
log "done. backups in $BACKUP"
