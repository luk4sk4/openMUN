$ErrorActionPreference = 'Stop'
$projectPath = Split-Path -Parent $PSScriptRoot
$archivePath = Join-Path $projectPath 'node_modules/.cache/luax-rehearsal.tar.gz'
Push-Location $projectPath
try {
  tar.exe -czf $archivePath backend/luax/src backend/luax/server.js backend/luax/package.json backend/luax/test src/services/luaxAccess.js
  if ($LASTEXITCODE -ne 0) { throw 'Could not package rehearsal source' }
  $archiveData = [Convert]::ToBase64String([IO.File]::ReadAllBytes($archivePath))
  $rehearsalScript = @'
set -euo pipefail
umask 077
task_dir=$(mktemp -d /home/ubuntu/openmun-test.XXXXXXXX)
container_name=openmun-test-$(date +%s)
trap 'docker rm -f "$container_name" >/dev/null 2>&1 || true' EXIT
base64 -d > "$task_dir/source.tgz" <<'ARCHIVE'
__ARCHIVE__
ARCHIVE
tar -xzf "$task_dir/source.tgz" -C "$task_dir"
export POSTGRES_PASSWORD=$(openssl rand -hex 24) POSTGRES_DB=openmun_test_migration
docker run -d --rm --pull never --name "$container_name" -e POSTGRES_PASSWORD -e POSTGRES_DB -p 127.0.0.1::5432 postgres:16-alpine >/dev/null
for attempt in $(seq 1 30); do docker exec "$container_name" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1 && break; sleep 1; done
export DB_HOST=127.0.0.1 DB_USER=postgres DB_PASSWORD="$POSTGRES_PASSWORD" DB_NAME="$POSTGRES_DB"
export DB_PORT=$(docker port "$container_name" 5432/tcp | cut -d: -f2)
export PIN_PEPPER=$(openssl rand -hex 32) BOOTSTRAP_TOKEN=$(openssl rand -hex 32)
export RUN_POSTGRES_TESTS=1 NODE_PATH=/home/ubuntu/openMUN/node_modules
cd "$task_dir/backend/luax"
node --test test/postgres.test.js
python3 - "$task_dir/legacy.sqlite" <<'PY'
import sqlite3, sys
with sqlite3.connect('file:/home/ubuntu/comites/data/openmun.db?mode=ro', uri=True) as source, sqlite3.connect(sys.argv[1]) as target:
    source.backup(target)
    assert target.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
PY
docker exec "$container_name" createdb -U postgres openmun_test_import
export DB_NAME=openmun_test_import MIGRATION_DB_USER="$DB_USER" MIGRATION_DB_PASSWORD="$DB_PASSWORD"
node src/db/migrate.js
node src/db/import-sqlite.js "$task_dir/legacy.sqlite"
node src/db/import-sqlite.js "$task_dir/legacy.sqlite"
printf 'Private rehearsal directory: %s\n' "$task_dir"
'@
  $rehearsalScript.Replace('__ARCHIVE__', $archiveData) | ssh.exe -i '..\EuInc\eu-inc\oracle\llaveluax.key' -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=8 ubuntu@82.70.73.77 "tr -d '\r' | bash -s"
  if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL rehearsal failed' }
} finally { Pop-Location }
