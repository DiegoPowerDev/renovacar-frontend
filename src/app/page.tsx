"use client";
import UserDashboard from "@/components/dashboard/mainDashboard";
import HomeFooter from "@/components/footers/home-footer";
import DashboardSidebar from "@/components/sidebar/dashboardSidebar";
import { useDashboardStore } from "@/store/dashboardStore";
import { screens } from "@/content/screens";
import EmberParticles from "@/components/animations/EmberParticles";

export default function Home() {
  const { section } = useDashboardStore();

  const DashboardComponent =
    screens.find((e) => e.title.toLowerCase() === section.toLowerCase())
      ?.component || UserDashboard;

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
