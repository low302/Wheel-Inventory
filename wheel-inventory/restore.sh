#!/bin/sh
# PostgreSQL Restore Script

set -e

BACKUP_DIR=${BACKUP_DIR:-./backups}
BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: ./restore.sh <backup_file>"
    echo ""
    echo "Available backups:"
    ls -lh "$BACKUP_DIR"/wheel_inventory_*.sql.gz 2>/dev/null || echo "No backups found"
    echo ""
    echo "Or use 'latest' to restore the most recent backup:"
    echo "  ./restore.sh latest"
    exit 1
fi

# Handle 'latest' keyword
if [ "$BACKUP_FILE" = "latest" ]; then
    BACKUP_FILE="$BACKUP_DIR/latest.sql"
    if [ ! -L "$BACKUP_FILE" ]; then
        echo "Error: No latest backup found"
        exit 1
    fi
    BACKUP_FILE=$(readlink -f "$BACKUP_FILE")
else
    # If not an absolute path, prepend backup directory
    if [ "${BACKUP_FILE#/}" = "$BACKUP_FILE" ]; then
        BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
    fi
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "Restoring from: $BACKUP_FILE"
echo "WARNING: This will overwrite the current database!"
echo "Press Ctrl+C within 5 seconds to cancel..."
sleep 5

# Decompress if needed
if [ "${BACKUP_FILE%.gz}" != "$BACKUP_FILE" ]; then
    echo "Decompressing backup..."
    TMP_FILE="/tmp/restore_$$.sql"
    gunzip -c "$BACKUP_FILE" > "$TMP_FILE"
    RESTORE_FILE="$TMP_FILE"
else
    RESTORE_FILE="$BACKUP_FILE"
fi

# Restore the database
echo "Restoring database..."
export PGPASSWORD=${DB_PASSWORD:-wheelpass}
psql -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} -U ${DB_USER:-wheeluser} -d ${DB_NAME:-wheel_inventory} < "$RESTORE_FILE"

# Cleanup temp file
if [ -n "$TMP_FILE" ]; then
    rm -f "$TMP_FILE"
fi

echo "Restore completed successfully!"
exit 0
