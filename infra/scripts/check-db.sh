#!/usr/bin/env bash
# Quick check: list tables, columns, indexes in tara_dev
set -e
echo "=== Tables ==="
docker exec tara-postgres psql -U tara -d tara_dev -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
echo ""
echo "=== Users columns ==="
docker exec tara-postgres psql -U tara -d tara_dev -c "\d users"
echo ""
echo "=== Properties columns ==="
docker exec tara-postgres psql -U tara -d tara_dev -c "\d properties"
echo ""
echo "=== Enums ==="
docker exec tara-postgres psql -U tara -d tara_dev -c "SELECT t.typname, e.enumlabel FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid ORDER BY t.typname, e.enumsortorder;"
