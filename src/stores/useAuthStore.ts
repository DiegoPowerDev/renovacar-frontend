// stores/useAuthStore.ts
import { create } from "zustand";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  User,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/firebase/config";
import type { AppRole, AppUser } from "@/types/auth";

type AuthState = {
  user: User | null;
  profile: AppUser | null;
  loading: boolean;
  error: string | null;
  init: () => () => void; // devuelve unsubscribe
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: AppRole[]) => boolean;
  can: (perm: Permission) => boolean;
};

export type Permission =
  | "clientes.write"
  | "vehiculos.write"
  | "ordenes.write"
  | "cotizacion.write"
  | "pagos.write"
  | "produccion.write"
  | "calidad.write"
  | "entrega.write"
  | "catalogo.write"
  | "stats.view"
  | "users.manage";

export const ROLE_PERMS: Record<AppRole, Permission[]> = {
  admin: [
    "clientes.write",
    "vehiculos.write",
    "ordenes.write",
    "cotizacion.write",
    "pagos.write",
    "produccion.write",
    "calidad.write",
    "entrega.write",
    "catalogo.write",
    "stats.view",
    "users.manage",
  ],
  comercial: [
    "clientes.write",
    "vehiculos.write",
    "ordenes.write",
    "cotizacion.write",
    "stats.view",
  ],
  taller: ["produccion.write", "ordenes.write", "stats.view"],
  calidad: ["calidad.write", "entrega.write", "stats.view"],
  finanzas: ["pagos.write", "stats.view"],
  viewer: ["stats.view"],
};

function permsFromRoles(roles: AppRole[]): Set<Permission> {
  const set = new Set<Permission>();
  for (const r of roles) {
    (ROLE_PERMS[r] || []).forEach((p) => set.add(p));
  }
  return set;
}

async function loadProfile(
  uid: string,
  email: string | null,
): Promise<AppUser> {
  const ref = doc(db, "usuarios", uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const d = snap.data();
    return {
      uid,
      email: d.email || email || "",
      nombre: d.nombre || email || "Usuario",
      roles: (d.roles as AppRole[]) || ["viewer"],
      activo: d.activo !== false,
      creadoEn: d.creadoEn?.toDate?.() ?? null,
    };
  }

  // Primer login: crear perfil viewer (el admin lo eleva después)
  const profile: AppUser = {
    uid,
    email: email || "",
    nombre: email?.split("@")[0] || "Usuario",
    roles: ["viewer"],
    activo: true,
  };
  await setDoc(ref, {
    ...profile,
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
  });
  return profile;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  error: null,

  init: () => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        set({ user: null, profile: null, loading: false, error: null });
        return;
      }
      try {
        set({ loading: true });
        const profile = await loadProfile(user.uid, user.email);
        if (!profile.activo) {
          await fbSignOut(auth);
          set({
            user: null,
            profile: null,
            loading: false,
            error: "Usuario desactivado",
          });
          return;
        }
        set({ user, profile, loading: false, error: null });
      } catch (err: any) {
        console.error(err);
        set({
          user,
          profile: null,
          loading: false,
          error: err?.message || "Error al cargar perfil",
        });
      }
    });
    return unsub;
  },

  login: async (email, password) => {
    set({ error: null, loading: true });
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // profile lo carga onAuthStateChanged
    } catch (err: any) {
      const msg =
        err?.code === "auth/invalid-credential"
          ? "Correo o contraseña incorrectos"
          : err?.message || "Error al iniciar sesión";
      set({ loading: false, error: msg });
      throw new Error(msg);
    }
  },

  logout: async () => {
    await fbSignOut(auth);
    set({ user: null, profile: null, error: null });
  },

  hasRole: (...roles) => {
    const profile = get().profile;
    if (!profile) return false;
    if (profile.roles.includes("admin")) return true;
    return roles.some((r) => profile.roles.includes(r));
  },

  can: (perm) => {
    const profile = get().profile;
    if (!profile) return false;
    if (profile.roles.includes("admin")) return true;
    return permsFromRoles(profile.roles).has(perm);
  },
}));
