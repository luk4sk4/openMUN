# Usage: BACKUP=/home/ubuntu/openmun-backups/cutover-production.XXXX bash openmun-rollback.sh
# Early rollback (before real writes in PostgreSQL): legacy back on api.openmun.app.
set -euo pipefail
BACKUP=${BACKUP:?}
sudo cp "$BACKUP/nginx-default.conf" /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
pm2 stop openmun-backend >/dev/null || true
pm2 start comites-app >/dev/null
sleep 2
curl -fsS -o /dev/null -w 'legacy HTTP %{http_code}\n' http://127.0.0.1:3000/api/conferencias/esjmun/resumen || true
pm2 save >/dev/null
echo "Rollback done. PostgreSQL DB 'openmun' kept for analysis; previous DB is openmun_pre_cutover_*."
