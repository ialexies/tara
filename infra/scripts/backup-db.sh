#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="$HOME/backups/tara"
CONTAINER="tara-staging-postgres-1"
DB_USER="tara"
DB_NAME="tara_staging"
KEEP_DAYS=14

mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTFILE="$BACKUP_DIR/tara_${TIMESTAMP}.sql.gz"

docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$OUTFILE"
echo "Backup written: $OUTFILE ($(du -sh "$OUTFILE" | cut -f1))"

# Prune backups older than KEEP_DAYS
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +"$KEEP_DAYS" -delete
echo "Pruned backups older than ${KEEP_DAYS} days"
