"use client";
import { Moon, Sun } from "lucide-react";
import { useDashboardStore } from "@/stores/dashboardStore";

export default function ButtonTheme() {
  const { theme, setTheme } = useDashboardStore();

  return (
    <div
      onClick={() => {
        if (theme === "day") {
          setTheme("night");
        }
        if (theme === "night") {
          setTheme("day");
        }
      }}
      className={`${theme === "day" ? "bg-white" : "bg-black"} border-2 border-black h-8  w-12 rounded-full transition-all duration-400 flex items-center justify-center select-none cursor-pointer`}
    >
      {theme === "day" ? (
        <Sun fill="yellow" stroke="black" />
      ) : (
        <Moon fill="yellow" />
      )}
    </div>
  );
}
