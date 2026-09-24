"use client";
import { BookUser, Bot, Home, Settings, Sidebar, User } from "lucide-react";
import { cn } from "../../lib/utils";
import { useDashboardStore } from "../../store/dashboardStore";
import { screens } from "@/content/screens";
import Image from "next/image";

export default function DashboardSidebar() {
  const { setSection, section, open, setOpen } = useDashboardStore();

  return (
    <div className="flex flex-col max-h-screen w-fit bg-stone-500/20 backdrop-blur-lg  truncate justify-between items-center transition-all duration-800">
      <div className="flex items-center justify-center overflow-hidden max-h-16">
        {open && (
          <Image
            src="/logo.webp"
            width={100}
            height={50}
            alt="logo"
            loading="eager"
            className="w-full h-full object-cover p-2 bg-white rounded-xl"
          />
        )}
      </div>
      <div className="flex flex-col w-full items-center justify-center h-full">
        {screens.map((e, i) => (
          <div
            key={i}
            onClick={() => {
              setSection(e.title.toLowerCase());
            }}
            className={cn(
              !open && "justify-center",
              section === e.title.toLowerCase() && "bg-white text-black ",
              "w-full p-4 flex gap-2 cursor-pointer ",
            )}
          >
            <e.icon size={25} /> {open && e.title}
          </div>
        ))}
      </div>
      <div
        onClick={() => setOpen(!open)}
        className={cn(
          !open && "justify-center",
          "w-full flex gap-2 p-4 cursor-pointer",
        )}
      >
        <Sidebar size={25} />
        {open && "Open"}
      </div>
    </div>
  );
}
