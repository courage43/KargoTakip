"use client";
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

export interface RtOlay { kanal: string; [k: string]: unknown }

/** Realtime servisine bağlan; her olayda callback çağır. token: kurye uygulaması Bearer'ı; yoksa /api/auth/socket-token'dan alınır */
export function useRealtime(onOlay: (o: RtOlay) => void, token?: string) {
  const [bagli, setBagli] = useState(false);
  const cbRef = useRef(onOlay);
  cbRef.current = onOlay;
  useEffect(() => {
    let s: Socket | null = null;
    let iptal = false;
    (async () => {
      let t = token;
      if (!t) {
        try { const r = await fetch("/api/auth/socket-token"); if (r.ok) t = (await r.json()).token; } catch { /* yok */ }
      }
      if (iptal || !t) return;
      const url = process.env.NEXT_PUBLIC_REALTIME_URL ?? "";
      s = io(url, { auth: { token: t }, transports: ["websocket", "polling"] });
      s.on("connect", () => setBagli(true));
      s.on("disconnect", () => setBagli(false));
      s.on("olay", (o: RtOlay) => cbRef.current(o));
    })();
    return () => { iptal = true; s?.disconnect(); };
  }, [token]);
  return bagli;
}
