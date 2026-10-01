import { auth } from "@/firebase/config";
import { create } from "zustand";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import type { AppRole, AppUser } from "@/types/auth";

type CreateUserInput = {
  email: string;
  password: string;
  nombre: string;
  roles: AppRole[];
  activo?: boolean;
};

type UsersAdminState = {
  users: AppUser[];
  loading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
  updateUser: (
    uid: string,
    data: { roles?: AppRole[]; activo?: boolean; nombre?: string },
  ) => Promise<void>;
  createUser: (data: CreateUserInput) => Promise<AppUser>;
  deleteUser: (uid: string) => Promise<void>;
};

function mapUser(id: string, d: Record<string, any>): AppUser {
  return {
    uid: id,
    email: d.email || "",
    nombre: d.nombre || "",
    roles: (d.roles as AppRole[]) || ["viewer"],
    activo: d.activo !== false,
    creadoEn: d.creadoEn?.toDate?.() ?? null,
  };
}

async function adminHeaders() {
  const user = auth.currentUser;
  if (!user) throw new Error("No hay sesión");
  const token = await user.getIdToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export const useUsersAdminStore = create<UsersAdminState>((set, get) => ({
  users: [],
  loading: false,
  error: null,

  fetchUsers: async () => {
    set({ loading: true, error: null });
    try {
      const snap = await getDocs(
        query(collection(db, "usuarios"), orderBy("email", "asc")),
      );
      const users = snap.docs.map((d) =>
        mapUser(d.id, d.data() as Record<string, any>),
      );
      set({ users, loading: false });
    } catch (err: any) {
      set({
        loading: false,
        error: err?.message || "Error al cargar usuarios",
      });
    }
  },

  updateUser: async (uid, data) => {
    await updateDoc(doc(db, "usuarios", uid), {
      ...data,
      actualizadoEn: serverTimestamp(),
    });
    set({
      users: get().users.map((u) => (u.uid === uid ? { ...u, ...data } : u)),
    });
  },

  createUser: async (data) => {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: await adminHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error al crear");

    const user: AppUser = {
      uid: json.uid,
      email: json.email,
      nombre: json.nombre,
      roles: json.roles,
      activo: json.activo !== false,
      creadoEn: new Date(),
    };
    set({
      users: [...get().users, user].sort((a, b) =>
        a.email.localeCompare(b.email),
      ),
    });
    return user;
  },

  deleteUser: async (uid) => {
    const res = await fetch(`/api/admin/users/${uid}`, {
      method: "DELETE",
      headers: await adminHeaders(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error al eliminar");
    set({ users: get().users.filter((u) => u.uid !== uid) });
  },
}));
