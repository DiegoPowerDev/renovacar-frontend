"use client";

import { useEffect } from "react";
import UserDashboard from "@/components/dashboard/mainDashboard";
import HomeFooter from "@/components/footers/home-footer";
import DashboardSidebar from "@/components/sidebar/dashboardSidebar";
import { useDashboardStore } from "@/stores/dashboardStore";
import { useBootstrapStore } from "@/stores/useBootstrapStore";
import { screens } from "@/content/screens";
import EmberParticles from "@/components/animations/EmberParticles";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import MainDashboard from "@/components/dashboard/mainDashboard";

export default function Home() {
  const router = useRouter();
  const { section, setSection } = useDashboardStore();
  const { ready, loading, error, startRealtime, stopRealtime } =
    useBootstrapStore();
  const { user, profile, loading: authLoading } = useAuthStore();
  const can = useAuthStore((s) => s.can);

  const visibleScreens = screens.filter(
    (s) => s.enable && (!s.permission || can(s.permission)),
  );

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    startRealtime();
    return () => stopRealtime();
  }, [user, startRealtime, stopRealtime]);

  const current =
    visibleScreens.find(
      (e) => e.title.toLowerCase() === section.toLowerCase(),
    ) || visibleScreens[0];

  const DashboardComponent = current?.component || MainDashboard;

  useEffect(() => {
    if (
      section &&
      !visibleScreens.some(
        (s) => s.title.toLowerCase() === section.toLowerCase(),
      )
    ) {
      setSection(visibleScreens[0]?.title || "Dashboard");
    }
  }, [section, visibleScreens, setSection]);

  if (authLoading || !user || !profile) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white/50 text-sm">
        Verificando sesión...
      </div>
    );

    if (loading || !ready) {
      return (
        <div className="h-screen flex flex-col items-center justify-center bg-black text-white gap-3">
          <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-sm text-white/50">Cargando Renova...</p>
          {error && <p className="text-sm text-rose-400">{error}</p>}
        </div>
      );
    }
  }
  return (
    <div className="w-full flex-1 flex overflow-hidden flex-col bg-black text-white relative">
      <EmberParticles />
      <main className="h-[calc(100vh-48px)] flex w-full relative">
        <DashboardSidebar />
        <div className="flex-1 min-w-0 overflow-y-auto pt-14 md:pt-0">
          <DashboardComponent />
        </div>
      </main>
      <div className="w-full bg-stone-500/20 backdrop-blur-lg flex justify-center shrink-0 z-10">
        <HomeFooter />
      </div>
    </div>
  );
}
