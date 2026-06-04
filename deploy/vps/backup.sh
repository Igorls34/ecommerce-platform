#!/bin/bash
set -e

BACKUP_DIR="/var/backups/thessara"
DB_NAME="thessara"
DB_USER="thessara"
DB_PASS="thessarasenha"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${DATE}.sql.gz"
KEEP_DAYS=7

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Iniciando backup do banco ${DB_NAME}..."

mysqldump -u "$DB_USER" -p"$DB_PASS" --no-tablespaces "$DB_NAME" | gzip > "$BACKUP_FILE"

echo "[$(date)] Backup salvo em ${BACKUP_FILE} ($(du -h "$BACKUP_FILE" | cut -f1))"

find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +$KEEP_DAYS -delete

echo "[$(date)] Backups antigos removidos (mantendo ${KEEP_DAYS} dias)."
echo "[$(date)] Backup concluido."
