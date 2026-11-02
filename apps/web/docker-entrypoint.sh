#!/bin/sh
set -e
echo "Veritabanı migration uygulanıyor..."
node node_modules/prisma/build/index.js migrate deploy --schema packages/db/prisma/schema.prisma
exec "$@"
