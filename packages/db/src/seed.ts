import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEposta = process.env.SEED_ADMIN_EMAIL ?? "admin@oda.local";
  const adminSifre = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!";

  const admin = await prisma.user.upsert({
    where: { eposta: adminEposta },
    update: {},
    create: {
      rol: "ODA_ADMIN",
      adSoyad: "Oda Yöneticisi",
      eposta: adminEposta,
      sifreHash: await bcrypt.hash(adminSifre, 10),
    },
  });

  const firma = await prisma.courierCompany.upsert({
    where: { id: "seed-firma" },
    update: {},
    create: { id: "seed-firma", ad: "Örnek Kurye A.Ş.", telefon: "2120000000" },
  });

  await prisma.user.upsert({
    where: { eposta: "firma@kurye.local" },
    update: {},
    create: {
      rol: "KURYE_FIRMA_YONETICI",
      adSoyad: "Firma Yöneticisi",
      eposta: "firma@kurye.local",
      sifreHash: await bcrypt.hash("Firma123!", 10),
      courierCompanyId: firma.id,
    },
  });

  for (const [i, ad] of ["Ahmet Kurye", "Mehmet Kurye", "Ayşe Kurye"].entries()) {
    const telefon = `555000000${i + 1}`;
    await prisma.user.upsert({
      where: { telefon },
      update: {},
      create: {
        rol: "KURYE",
        adSoyad: ad,
        telefon,
        pinHash: await bcrypt.hash("1234", 10),
        courierCompanyId: firma.id,
      },
    });
  }

  await prisma.setting.upsert({
    where: { key: "ODA_ADI" },
    update: {},
    create: { key: "ODA_ADI", value: process.env.ODA_ADI ?? "Ticaret Odası" },
  });

  console.log(`Seed tamam. Admin: ${admin.eposta} / ${adminSifre}; Firma: firma@kurye.local / Firma123!; Kurye: 5550000001 / 1234`);
}

main().finally(() => prisma.$disconnect());
