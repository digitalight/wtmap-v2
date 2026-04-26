#!/bin/bash
# Database backup script — run before any migrations or upgrades
# Usage: DATABASE_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres" ./scripts/backup-db.sh

set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Error: DATABASE_URL environment variable is not set."
  echo "Usage: DATABASE_URL=\"postgresql://...\" ./scripts/backup-db.sh"
  exit 1
fi

BACKUP_DIR="$(dirname "$0")/../backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup-${TIMESTAMP}.sql"

echo "Starting backup to ${BACKUP_FILE} ..."
pg_dump "$DATABASE_URL" \
  --no-owner \
  --no-acl \
  --format=plain \
  --file="$BACKUP_FILE"

echo "Backup complete: ${BACKUP_FILE}"
echo "Size: $(du -sh "$BACKUP_FILE" | cut -f1)"
