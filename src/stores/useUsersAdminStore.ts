// stores/useUsersAdminStore.ts
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

type UsersAdminState = {
  users: AppUser[];
  loading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
  updateUser: (
    uid: string,
    data: { roles?: AppRole[]; activo?: boolean; nombre?: string },
  ) => Promise<void>;
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
    const ref = doc(db, "usuarios", uid);
    await updateDoc(ref, {
      ...data,
      actualizadoEn: serverTimestamp(),
    });
    // refrescar lista local
    const users = get().users.map((u) =>
      u.uid === uid ? { ...u, ...data } : u,
    );
    set({ users });
  },
}));
