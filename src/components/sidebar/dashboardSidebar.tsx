"use client";

import { useEffect } from "react";
import { Menu, PanelLeftClose, PanelLeft, LogOut, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/stores/dashboardStore";
import { screens } from "@/content/screens";
import { useAuthStore } from "@/stores/useAuthStore";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function DashboardSidebar() {
  const router = useRouter();
  const { setSection, section, open, setOpen } = useDashboardStore();
  const can = useAuthStore((s) => s.can);
  const profile = useAuthStore((s) => s.profile);
  const logout = useAuthStore((s) => s.logout);

  // mobile drawer
  const mobileOpen = useDashboardStore((s) => s.mobileOpen);
  const setMobileOpen = useDashboardStore((s) => s.setMobileOpen);

  const visibleScreens = screens.filter(
    (s) => s.enable && (!s.permission || can(s.permission)),
  );

  useEffect(() => {
    setMobileOpen?.(false);
  }, [section, setMobileOpen]);

  const handleNav = (title: string) => {
    setSection(title.toLowerCase());
    setMobileOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const NavItems = ({ compact = false }: { compact?: boolean }) => (
    <nav className="flex flex-col gap-0.5 w-full px-2 py-2">
      {visibleScreens.map((item) => {
        const active = section === item.title.toLowerCase();
        return (
          <button
            key={item.title}
            type="button"
            onClick={() => handleNav(item.title)}
            className={cn(
              "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
              compact && "justify-center px-2",
              active
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "text-white/70 hover:bg-white/5 hover:text-white border border-transparent",
            )}
          >
            <item.icon size={20} className="shrink-0" />
            {!compact && (
              <span className="truncate font-medium">{item.title}</span>
            )}
          </button>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* ========== DESKTOP ========== */}
      <aside
        className={cn(
          "hidden md:flex flex-col h-full shrink-0 border-r border-white/10 bg-stone-500/15 backdrop-blur-lg transition-all duration-300",
          open ? "w-56" : "w-[72px]",
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "flex items-center h-16 px-3 shrink-0",
            open ? "justify-start" : "justify-center",
          )}
        >
          {open ? (
            <Image
              src="/logo.webp"
              width={120}
              height={40}
              alt="Renova"
              className="h-9 w-auto object-contain bg-white rounded-lg p-1"
              priority
            />
          ) : (
            <Image
              src="/logo.webp"
              width={36}
              height={36}
              alt="Renova"
              className="h-9 w-9 object-cover bg-white rounded-lg"
              priority
            />
          )}
        </div>
        <div>
          {profile && open && (
            <p className="px-3 py-1 text-center text-lg text-white truncate">
              Hola {profile.nombre || profile.email}
            </p>
          )}
        </div>
        {/* Links */}
        <div className="flex-1 overflow-y-auto py-2">
          <NavItems compact={!open} />
        </div>

        {/* User + collapse */}
        <div className="border-t border-white/30 p-2 space-y-1 shrink-0">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className={cn(
              "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/60 hover:bg-white/5 hover:text-white transition-colors",
              !open && "justify-center px-2",
            )}
          >
            {open ? (
              <PanelLeftClose size={20} className="shrink-0" />
            ) : (
              <PanelLeft size={20} className="shrink-0" />
            )}
            {open && <span>Contraer</span>}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/60 hover:bg-rose-500/10 hover:text-rose-300 transition-colors",
              !open && "justify-center px-2",
            )}
          >
            <LogOut size={20} className="shrink-0" />
            {open && <span>Salir</span>}
          </button>
        </div>
      </aside>

      {/* ========== MÓVIL: top bar ========== */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center justify-between px-3 border-b border-white/10 bg-black/80 backdrop-blur-lg">
        <button
          type="button"
          onClick={() => setMobileOpen?.(true)}
          className="p-2 rounded-lg text-white/80 hover:bg-white/10"
          aria-label="Abrir menú"
        >
          <Menu size={22} />
        </button>
        <Image
          src="/logo.webp"
          width={100}
          height={32}
          alt="Renova"
          className="h-8 w-auto object-contain bg-white rounded-md p-0.5"
        />
        <div className="w-10" /> {/* balance */}
      </div>

      {/* ========== MÓVIL: drawer ========== */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* overlay */}
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen?.(false)}
            aria-label="Cerrar menú"
          />
          {/* panel */}
          <div className="relative z-10 flex flex-col w-[min(100%,280px)] h-full bg-zinc-950 border-r border-white/10 shadow-xl animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between h-14 px-3 border-b border-white/10">
              <Image
                src="/logo.webp"
                width={100}
                height={32}
                alt="Renova"
                className="h-8 w-auto object-contain bg-white rounded-md p-0.5"
              />
              <button
                type="button"
                onClick={() => setMobileOpen?.(false)}
                className="p-2 rounded-lg text-white/70 hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
              <div>
                {profile && (
                  <p className="px-3 py-1 text-center text-lg text-white truncate">
                    Hola {profile.nombre || profile.email}
                  </p>
                )}
              </div>
              <NavItems />
            </div>

            <div className="border-t border-white/10 p-3 space-y-1">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-rose-300/90 hover:bg-rose-500/10"
              >
                <LogOut size={20} />
                Salir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
