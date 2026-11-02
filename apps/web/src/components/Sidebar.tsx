import Link from "next/link";
import { cikisYap } from "@/app/actions/auth";

export function Sidebar({ baslik, ad, rolEtiket, linkler, bekleyen }: {
  baslik: string; ad: string; rolEtiket: string;
  linkler: { href: string; etiket: string; sayi?: number }[];
  bekleyen?: number;
}) {
  return (
    <aside className="w-60 shrink-0 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="font-semibold">{baslik}</div>
        <div className="text-xs text-gray-500">{ad} · {rolEtiket}</div>
      </div>
      <nav className="p-2 flex-1 space-y-0.5">
        {linkler.map((l) => (
          <Link key={l.href} href={l.href} className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100">
            <span>{l.etiket}</span>
            {l.sayi ? <span className="badge bg-amber-100 text-amber-800">{l.sayi}</span> : null}
          </Link>
        ))}
      </nav>
      <form action={cikisYap} className="p-3 border-t border-gray-200">
        <button className="btn-secondary w-full justify-center btn-sm">Çıkış</button>
      </form>
      {bekleyen !== undefined && null}
    </aside>
  );
}
