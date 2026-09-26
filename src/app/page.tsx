"use client";

import { useEffect } from "react";
import UserDashboard from "@/components/dashboard/mainDashboard";
import HomeFooter from "@/components/footers/home-footer";
import DashboardSidebar from "@/components/sidebar/dashboardSidebar";
import { useDashboardStore } from "@/stores/dashboardStore";
import { useBootstrapStore } from "@/stores/useBootstrapStore";
import { screens } from "@/content/screens";
import EmberParticles from "@/components/animations/EmberParticles";

export default function Home() {
  const { section } = useDashboardStore();
  const { ready, loading, error, startRealtime, stopRealtime } =
    useBootstrapStore();

  useEffect(() => {
    startRealtime();
    return () => stopRealtime();
  }, [startRealtime, stopRealtime]);

  const DashboardComponent =
    screens.find((e) => e.title.toLowerCase() === section.toLowerCase())
      ?.component || UserDashboard;

  if (loading || !ready) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-black text-white gap-3">
        <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-sm text-white/50">Cargando Renova...</p>
        {error && (
          <p className="text-sm text-rose-400 max-w-md text-center">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex overflow-hidden flex-col bg-black text-white relative">
      <EmberParticles />
      <main className="h-[calc(100vh-48px)] flex w-full">
        <DashboardSidebar />
        <DashboardComponent />
      </main>
      <div className="w-full bg-stone-500/20 backdrop-blur-lg flex justify-center shrink-0 z-10">
        <HomeFooter />
      </div>
    </div>
  );
}
