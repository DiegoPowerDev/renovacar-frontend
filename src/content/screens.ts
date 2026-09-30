import CatalogoDashboard from "@/components/dashboard/catalogoDashboard";
import ClientsDashboard from "@/components/dashboard/clientsDashboard";
import ConfigDashboard from "@/components/dashboard/configDashboard";
import ProfileDashboard from "@/components/dashboard/profileDashboard";
import VehiclesDashboard from "@/components/dashboard/vehiclesDashboard";
import MainDashboard from "@/components/dashboard/mainDashboard";
import OrdenesDashboard from "@/components/dashboard/ordenesDashboard";
import UsersAdminDashboard from "@/components/dashboard/usersAdminDashboard";
import {
  BookOpenText,
  BookUser,
  BriefcaseBusiness,
  CarFront,
  Home,
  LucideIcon,
  Settings,
  Shield,
  User,
  UserSearch,
} from "lucide-react";
import type { Permission } from "@/stores/useAuthStore";

export interface Screens {
  title: string;
  icon: LucideIcon;
  enable: boolean;
  component: React.ComponentType;
  /** Si se define, solo se muestra si can(permission) es true.
   *  Si es undefined, visible para cualquier usuario autenticado. */
  permission?: Permission;
}

export const screens: Screens[] = [
  {
    title: "Dashboard",
    icon: Home,
    enable: true,
    component: MainDashboard,
    permission: "stats.view",
  },
  {
    title: "Ordenes",
    icon: BriefcaseBusiness,
    enable: true,
    component: OrdenesDashboard,
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
    title: "Usuarios",
    icon: Shield,
    enable: true,
    component: UsersAdminDashboard,
    permission: "users.manage",
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
