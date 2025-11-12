#!/bin/sh
# Automated PostgreSQL Backup Script

set -e

BACKUP_DIR=${BACKUP_DIR:-/backups}
BACKUP_KEEP_DAYS=${BACKUP_KEEP_DAYS:-7}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/wheel_inventory_$TIMESTAMP.sql"
LATEST_LINK="$BACKUP_DIR/latest.sql"

echo "Starting backup at $(date)"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Perform backup
pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -F p -f "$BACKUP_FILE"

# Compress the backup
gzip "$BACKUP_FILE"
BACKUP_FILE="${BACKUP_FILE}.gz"

echo "Backup created: $BACKUP_FILE"

# Create/update symlink to latest backup
ln -sf "$(basename "$BACKUP_FILE")" "$LATEST_LINK"

# Remove old backups
find "$BACKUP_DIR" -name "wheel_inventory_*.sql.gz" -type f -mtime +$BACKUP_KEEP_DAYS -delete
echo "Old backups removed (keeping last $BACKUP_KEEP_DAYS days)"

# Get backup size
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "Backup completed successfully. Size: $BACKUP_SIZE"

# List current backups
echo "Current backups:"
ls -lh "$BACKUP_DIR"/wheel_inventory_*.sql.gz 2>/dev/null || echo "No backups found"

exit 0
