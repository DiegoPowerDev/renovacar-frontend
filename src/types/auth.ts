export type AppRole =
  | "admin"
  | "comercial"
  | "taller"
  | "calidad"
  | "finanzas"
  | "viewer";

export type AppUser = {
  uid: string;
  email: string;
  nombre: string;
  roles: AppRole[];
  activo: boolean;
  creadoEn?: Date | null;
};
