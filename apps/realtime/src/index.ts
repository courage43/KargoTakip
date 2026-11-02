/**
 * Realtime servisi: Postgres NOTIFY ('dagitim_events') → Socket.IO odaları.
 * Odalar: admin (tüm oda yöneticileri), firma:{companyId}, kurye:{userId}
 */
import { createServer } from "node:http";
import { Server } from "socket.io";
import pg from "pg";
import { jwtVerify } from "jose";

const PORT = Number(process.env.PORT ?? 3001);
const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? "gelistirme-gizli-anahtar-degistir-32+");

interface Oturum { sub: string; rol: string; companyId: string | null; ad: string }

const http = createServer((req, res) => {
  if (req.url === "/health") { res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify({ ok: true, baglanti: io.engine.clientsCount })); return; }
  res.writeHead(404); res.end();
});

const io = new Server(http, { cors: { origin: process.env.CORS_ORIGIN?.split(",") ?? "*", methods: ["GET", "POST"] } });

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("token yok"));
    const { payload } = await jwtVerify(token, secret);
    (socket.data as { oturum: Oturum }).oturum = { sub: payload.sub!, rol: String(payload.rol), companyId: (payload.companyId as string | null) ?? null, ad: String(payload.ad ?? "") };
    next();
  } catch {
    next(new Error("geçersiz token"));
  }
});

io.on("connection", (socket) => {
  const o = (socket.data as { oturum: Oturum }).oturum;
  if (o.rol === "ODA_ADMIN") socket.join("admin");
  else if (o.rol === "KURYE_FIRMA_YONETICI" && o.companyId) socket.join(`firma:${o.companyId}`);
  else if (o.rol === "KURYE") { socket.join(`kurye:${o.sub}`); if (o.companyId) socket.join(`firma-kurye:${o.companyId}`); }
  socket.emit("hazir", { rol: o.rol });
});

/** Olayı ilgili odalara dağıt */
function dagit(olay: Record<string, unknown>) {
  io.to("admin").emit("olay", olay);
  const companyId = olay.companyId as string | undefined;
  if (companyId) io.to(`firma:${companyId}`).emit("olay", olay);
  else io.to([...io.sockets.adapter.rooms.keys()].filter((r) => r.startsWith("firma:"))).emit("olay", olay); // companyId bilinmiyorsa tüm firmalar (kampanya bazlı filtre istemcide)
  const courierId = olay.courierId as string | undefined;
  if (courierId) io.to(`kurye:${courierId}`).emit("olay", olay);
  const shipmentIds = olay.shipmentIds as string[] | undefined;
  if (olay.tip === "atama" && !courierId && shipmentIds) {
    // atama kaldırıldı: eski kuryeleri bilmiyoruz, tüm kuryelere "yenile" sinyali
    io.to([...io.sockets.adapter.rooms.keys()].filter((r) => r.startsWith("kurye:"))).emit("olay", { kanal: "shipment", tip: "yenile" });
  }
}

async function dinle() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  client.on("error", (e) => { console.error("pg bağlantı hatası, yeniden bağlanılıyor", e.message); setTimeout(dinle, 2000); });
  await client.connect();
  await client.query("LISTEN dagitim_events");
  client.on("notification", (msg) => {
    if (!msg.payload) return;
    try { dagit(JSON.parse(msg.payload)); } catch (e) { console.error("payload hatası", e); }
  });
  console.log("Postgres LISTEN dagitim_events aktif");
}

dinle().catch((e) => { console.error("İlk bağlantı başarısız, 3 sn sonra tekrar", e.message); setTimeout(dinle, 3000); });
http.listen(PORT, () => console.log(`Realtime servisi :${PORT}`));
