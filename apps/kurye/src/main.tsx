import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";
import { Giris } from "./sayfalar/Giris";
import { Liste } from "./sayfalar/Liste";
import { Teslimat } from "./sayfalar/Teslimat";
import { tokenAl } from "./lib/api";
import { UygulamaSaglayici } from "./lib/durum";

function Korumali({ children }: { children: React.ReactNode }) {
  return tokenAl() ? <>{children}</> : <Navigate to="/giris" replace />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <UygulamaSaglayici>
        <Routes>
          <Route path="/giris" element={<Giris />} />
          <Route path="/" element={<Korumali><Liste /></Korumali>} />
          <Route path="/teslimat/:id" element={<Korumali><Teslimat /></Korumali>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </UygulamaSaglayici>
    </BrowserRouter>
  </React.StrictMode>,
);
