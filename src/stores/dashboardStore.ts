import { create } from "zustand";

interface DashboardStore {
  theme: "day" | "night";
  setTheme: (value: "day" | "night") => void;
  section: string;
  setSection: (value: string) => void;
  open: boolean;
  setOpen: (value: boolean) => void;
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  theme: "day",
  setTheme: (newTheme) => set({ theme: newTheme }),
  section: "dashboard",
  setSection: (newSection) => set({ section: newSection }),
  open: true,
  setOpen: (value) => set({ open: value }),
}));
