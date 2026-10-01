import { create } from "zustand";

interface DashboardStore {
  theme: "day" | "night";
  setTheme: (value: "day" | "night") => void;
  section: string;
  setSection: (value: string) => void;
  open: boolean; // desktop expandido/contraído
  setOpen: (value: boolean) => void;
  mobileOpen: boolean; // drawer móvil
  setMobileOpen: (v: boolean) => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  theme: "day",
  setTheme: (newTheme) => set({ theme: newTheme }),
  section: "dashboard",
  setSection: (newSection) => set({ section: newSection.toLowerCase() }),
  open: true,
  setOpen: (value) => set({ open: value }),
  mobileOpen: false,
  setMobileOpen: (value) => set({ mobileOpen: value }),
}));
