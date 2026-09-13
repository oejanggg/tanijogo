"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Receipt, Sprout, BarChart2 } from 'lucide-react';

const navItems = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/receipts', label: 'Receipt', icon: Receipt },
  { href: '/harvest', label: 'Update', icon: Sprout },
  { href: '/report', label: 'Report', icon: BarChart2 },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 shadow-[0_-4px_24px_0_rgba(0,0,0,0.06)] pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-1">
      <div className="flex items-center justify-around px-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href}
              className={"relative flex flex-col items-center justify-center py-1.5 px-5 rounded-2xl transition-all duration-200 " + (active ? "text-emerald-700" : "text-slate-400")}>
              <div className={"transition-transform duration-200 " + (active ? "scale-110" : "")}>
                <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              </div>
              <span className={"text-[10px] font-bold tracking-wide mt-0.5 " + (active ? "text-emerald-700" : "text-slate-400")}>
                {label}
              </span>
              {active && <span className="absolute -bottom-0.5 w-4 h-0.5 rounded-full bg-emerald-600" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
