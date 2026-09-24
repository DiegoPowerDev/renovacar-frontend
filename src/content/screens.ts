import CatalogoDashboard from "@/components/dashboard/catalogoDashboard";
import ClientsDashboard from "@/components/dashboard/clientsDashboard";
import ConfigDashboard from "@/components/dashboard/configDashboard";
import ProfileDashboard from "@/components/dashboard/profileDashboard";
import VehiclesDashboard from "@/components/dashboard/vehiclesDashboard";
import {
  BookOpenText,
  BookUser,
  CarFront,
  Home,
  LucideIcon,
  Settings,
  User,
  UserSearch,
} from "lucide-react";
import MainDashboard from "@/components/dashboard/mainDashboard";

interface Screens {
  title: string;
  icon: LucideIcon;
  enable: boolean;
  component: React.ComponentType;
}

export const screens: Screens[] = [
  {
    title: "Dashboard",
    icon: Home,
    enable: true,
    component: MainDashboard,
  },

  {
    title: "Clientes",
    icon: UserSearch,
    enable: true,
    component: ClientsDashboard,
  },
  {
    title: "Vehiculos",
    icon: CarFront,
    enable: true,
    component: VehiclesDashboard,
  },
  {
    title: "Catalogo",
    icon: BookOpenText,
    enable: true,
    component: CatalogoDashboard,
  },
  {
    title: "Contactos",
    icon: BookUser,
    enable: true,
    component: ConfigDashboard,
  },
  {
    title: "Perfil",
    icon: User,
    enable: true,
    component: ProfileDashboard,
  },
  {
    title: "Configuración",
    icon: Settings,
    enable: true,
    component: ConfigDashboard,
  },
];
