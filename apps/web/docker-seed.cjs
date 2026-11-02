// Deneme (yerel) kurulum için başlangıç kullanıcıları. Var olanlara dokunmaz.
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const p = new PrismaClient();
(async () => {
  const h = (s) => bcrypt.hash(s, 10);
  await p.user.upsert({ where: { eposta: "admin@oda.local" }, update: {}, create: { rol: "ODA_ADMIN", adSoyad: "Oda Yöneticisi", eposta: "admin@oda.local", sifreHash: await h("Admin123!") } });
  const f = await p.courierCompany.upsert({ where: { id: "seed-firma" }, update: {}, create: { id: "seed-firma", ad: "Örnek Kurye A.Ş.", telefon: "2120000000" } });
  await p.user.upsert({ where: { eposta: "firma@kurye.local" }, update: {}, create: { rol: "KURYE_FIRMA_YONETICI", adSoyad: "Firma Yöneticisi", eposta: "firma@kurye.local", sifreHash: await h("Firma123!"), courierCompanyId: f.id } });
  const kuryeler = ["Ahmet Kurye", "Mehmet Kurye", "Ayşe Kurye"];
  for (let i = 0; i < kuryeler.length; i++) {
    const telefon = `555000000${i + 1}`;
    await p.user.upsert({ where: { telefon }, update: {}, create: { rol: "KURYE", adSoyad: kuryeler[i], telefon, pinHash: await h("1234"), courierCompanyId: f.id } });
  }
  await p.setting.upsert({ where: { key: "ODA_ADI" }, update: {}, create: { key: "ODA_ADI", value: process.env.ODA_ADI || "Ticaret Odası" } });
  console.log("Deneme kullanıcıları hazır: admin@oda.local / Admin123!, firma@kurye.local / Firma123!, kurye 05550000001 / 1234");
  await p.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
