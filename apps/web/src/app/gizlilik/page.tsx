import { prisma } from "@/lib/db";

export default async function Gizlilik() {
  const oda = (await prisma.setting.findUnique({ where: { key: "ODA_ADI" } }))?.value ?? "Oda";
  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4 text-sm leading-relaxed">
      <h1 className="text-2xl font-semibold">Gizlilik Politikası — Dağıtım Kurye Uygulaması</h1>
      <p><b>Veri sorumlusu:</b> {oda}. Bu uygulama, {oda} tarafından üyelerine gönderilen zarfların kurye ile dağıtımını ve teslimatını yönetmek için kullanılır. Uygulamayı yalnızca {oda} ile sözleşmeli kurye firmasının yetkilendirdiği kuryeler kullanır.</p>
      <h2 className="text-lg font-semibold">İşlenen veriler</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li><b>Konum:</b> Kurye "Rotaya başla" dediği andan "Rotayı bitir" dediği ana kadar cihaz konumu, arka planda da olmak üzere, yaklaşık 30 saniye aralıkla sunucuya iletilir. Amaç: dağıtımın canlı izlenmesi, teslimatın adreste yapıldığının doğrulanması ve kurye hakedişinin hesaplanması. Rota kapalıyken konum alınmaz. Ham konum izleri 90 gün sonra silinir; rota özetleri (mesafe, süre) saklanır.</li>
        <li><b>Teslimat konumu:</b> Her teslimat kaydında alınan GPS noktası, üyenin adresinin doğrulanmış konumu olarak saklanır ve sonraki dağıtımlarda kuryeyi yönlendirmek için kullanılır.</li>
        <li><b>Kamera / fotoğraf:</b> Teslimat kanıtı olarak çekilen fotoğraflar ve teslim alan kişinin ekrana attığı imza. Cihazda saklanmaz, sunucuya iletilir; yalnızca yetkili panel kullanıcıları görebilir.</li>
        <li><b>Kurye bilgileri:</b> Ad, telefon numarası, cihaz bildirim kimliği (push token).</li>
        <li><b>Üye bilgileri:</b> Kuryeye yalnızca atanmış gönderiler için firma unvanı, adres ve iletişim telefonu gösterilir.</li>
      </ul>
      <h2 className="text-lg font-semibold">Saklama ve güvenlik</h2>
      <p>Veriler {oda}'nın kendi sunucusunda, şifreli bağlantı (HTTPS) üzerinden işlenir. Fotoğraf ve imzalara yalnızca oturum açmış yetkili kullanıcılar erişebilir. Üçüncü taraflarla paylaşılmaz; yalnızca SMS gönderimi için SMS operatörüne üye telefon numarası ve mesaj metni iletilir.</p>
      <h2 className="text-lg font-semibold">Haklarınız</h2>
      <p>6698 sayılı KVKK kapsamında verilerinize erişme, düzeltme ve silme taleplerinizi {oda} ile iletişime geçerek iletebilirsiniz. Kurye hesabı kapatıldığında cihaz bildirim kimliği silinir.</p>
      <p className="text-xs text-gray-500">Son güncelleme: {new Date().toLocaleDateString("tr-TR")}</p>
    </main>
  );
}
