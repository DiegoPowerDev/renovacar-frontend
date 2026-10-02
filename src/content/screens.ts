import CatalogoDashboard from "@/components/dashboard/catalogoDashboard";
import ClientsDashboard from "@/components/dashboard/clientsDashboard";
import ProfileDashboard from "@/components/dashboard/profileDashboard";
import VehiclesDashboard from "@/components/dashboard/vehiclesDashboard";
import MainDashboard from "@/components/dashboard/mainDashboard";
import OrdenesDashboard from "@/components/dashboard/ordenesDashboard";
import UsersAdminDashboard from "@/components/dashboard/usersAdminDashboard";
import {
  BookOpenText,
  BriefcaseBusiness,
  CarFront,
  History,
  Home,
  LucideIcon,
  ShieldUser,
  User,
  UserSearch,
} from "lucide-react";
import type { Permission } from "@/stores/useAuthStore";
import HistorialDashboard from "@/components/dashboard/historialDashboard";

export interface Screens {
  title: string;
  icon: LucideIcon;
  enable: boolean;
  component: React.ComponentType;
  permission?: Permission;
}

export const screens: Screens[] = [
  {
    title: "Dashboard",
    icon: Home,
    enable: true,
    component: MainDashboard,
  },
  {
    title: "Ordenes",
    icon: BriefcaseBusiness,
    enable: true,
    component: OrdenesDashboard,
    permission: "ordenes.write",
  },
  {
    title: "Clientes",
    icon: UserSearch,
    enable: true,
    component: ClientsDashboard,
    permission: "clientes.write",
  },
  {
    title: "Vehiculos",
    icon: CarFront,
    enable: true,
    component: VehiclesDashboard,
    permission: "vehiculos.write",
  },
  {
    title: "Catalogo",
    icon: BookOpenText,
    enable: true,
    component: CatalogoDashboard,
    permission: "catalogo.write",
  },
  {
    title: "Historial",
    icon: History,
    enable: true,
    component: HistorialDashboard,
  },
  {
    title: "Perfil",
    icon: User,
    enable: true,
    component: ProfileDashboard,
  },
  {
    title: "Panel Admin",
    icon: ShieldUser,
    enable: true,
    component: UsersAdminDashboard,
    permission: "users.manage",
  },
];
