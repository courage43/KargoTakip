#!/bin/sh
set -e
echo "Veritabanı migration uygulanıyor..."
node /opt/prisma/node_modules/prisma/build/index.js migrate deploy --schema packages/db/prisma/schema.prisma
if [ "${SEED_DEMO:-0}" = "1" ]; then
  echo "Deneme kullanıcıları oluşturuluyor..."
  node /app/docker-seed.cjs || echo "seed atlandı"
fi
exec "$@"
