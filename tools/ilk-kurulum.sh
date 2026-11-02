#!/bin/sh
# İlk kurulumdan sonra bir kez çalıştırın: admin kullanıcısını oluşturur.
# Kullanım: SEED_ADMIN_EMAIL=admin@oda.org.tr SEED_ADMIN_PASSWORD='Guclu!Sifre1' ./tools/ilk-kurulum.sh
set -e
docker compose exec -e SEED_ADMIN_EMAIL -e SEED_ADMIN_PASSWORD -e ODA_ADI web node -e '
const { PrismaClient } = require("@prisma/client"); const bcrypt = require("bcryptjs");
const p = new PrismaClient();
(async () => {
  const e = process.env.SEED_ADMIN_EMAIL || "admin@oda.local", s = process.env.SEED_ADMIN_PASSWORD || "Admin123!";
  await p.user.upsert({ where: { eposta: e }, update: {}, create: { rol: "ODA_ADMIN", adSoyad: "Oda Yöneticisi", eposta: e, sifreHash: await bcrypt.hash(s, 10) } });
  await p.setting.upsert({ where: { key: "ODA_ADI" }, update: {}, create: { key: "ODA_ADI", value: process.env.ODA_ADI || "Ticaret Odası" } });
  console.log("Admin hazır:", e); await p.$disconnect();
})();'
