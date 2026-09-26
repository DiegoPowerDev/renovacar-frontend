// src/stores/useCatalogoStore.ts
import { create } from "zustand";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "@/firebase/config";

// ======================
// TYPES
// ======================
export type ServicioCatalogo = {
  id: string;
  nombre: string;
  descripcion?: string | null;
  precioBase: number;
  activo: boolean;
  creadoEn?: Date | null;
  actualizadoEn?: Date | null;
};

export type ServicioCatalogoInput = {
  nombre: string;
  descripcion?: string;
  precioBase: number;
};

export type ServicioCatalogoUpdate = {
  nombre?: string;
  descripcion?: string;
  precioBase?: number;
  activo?: boolean;
};

type CatalogoState = {
  servicios: ServicioCatalogo[];
  loading: boolean;
  error: string | null;
  _unsubscribe: Unsubscribe | null;

  /** solo activos por defecto (como listarCatalogo(false)) */
  subscribe: (incluirInactivos?: boolean) => void;
  unsubscribe: () => void;

  create: (data: ServicioCatalogoInput) => Promise<ServicioCatalogo>;
  update: (
    id: string,
    data: ServicioCatalogoUpdate,
  ) => Promise<ServicioCatalogo>;
  /** soft delete: activo = false (igual que Nest por defecto) */
  remove: (id: string) => Promise<ServicioCatalogo>;
  /** borra el doc solo si no está referenciado en ítems de órdenes */
  destroy: (id: string) => Promise<void>;

  findById: (id: string) => Promise<ServicioCatalogo | null>;
};

// ======================
// HELPERS
// ======================
const COL = "catalogo";

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return new Date(value as string);
}

function mapServicio(
  id: string,
  data: Record<string, unknown>,
): ServicioCatalogo {
  return {
    id,
    nombre: (data.nombre as string) || "",
    descripcion: (data.descripcion as string) || null,
    precioBase: Number(data.precioBase) || 0,
    activo: data.activo !== false,
    creadoEn: toDate(data.creadoEn),
    actualizadoEn: toDate(data.actualizadoEn),
  };
}

/** Comprueba si algún ítem de alguna OT usa este servicio del catálogo */
async function countUsosEnOrdenes(servicioCatalogoId: string) {
  // Con subcolecciones no hay query global barata; opción práctica:
  // guardar en el doc del catálogo un contador `usos` al agregar ítems,
  // o escanear órdenes (ok con pocos datos).
  // Aquí usamos un campo opcional `usos` en el catálogo.
  const snap = await getDoc(doc(db, COL, servicioCatalogoId));
  if (!snap.exists()) return 0;
  return Number(snap.data().usos) || 0;
}

// ======================
// STORE
// ======================
export const useCatalogoStore = create<CatalogoState>((set, get) => ({
  servicios: [],
  loading: true,
  error: null,
  _unsubscribe: null,

  subscribe: (incluirInactivos = false) => {
    get().unsubscribe();
    set({ loading: true, error: null });

    const q = incluirInactivos
      ? query(collection(db, COL), orderBy("nombre", "asc"))
      : query(
          collection(db, COL),
          where("activo", "==", true),
          orderBy("nombre", "asc"),
        );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const servicios = snapshot.docs.map((d) =>
          mapServicio(d.id, d.data() as Record<string, unknown>),
        );
        set({ servicios, loading: false, error: null });
      },
      (err) => {
        console.error("Error catalogo onSnapshot:", err);
        set({
          loading: false,
          error: err.message || "Error al cargar catálogo",
        });
      },
    );

    set({ _unsubscribe: unsub });
  },

  unsubscribe: () => {
    const unsub = get()._unsubscribe;
    if (unsub) {
      unsub();
      set({ _unsubscribe: null });
    }
  },

  findById: async (id) => {
    const snap = await getDoc(doc(db, COL, id));
    if (!snap.exists()) return null;
    return mapServicio(snap.id, snap.data() as Record<string, unknown>);
  },

  create: async (data) => {
    if (!data.nombre?.trim()) {
      throw new Error("El nombre es obligatorio");
    }
    if (data.precioBase == null || data.precioBase < 0) {
      throw new Error("El precio base debe ser 0 o mayor");
    }

    const payload = {
      nombre: data.nombre.trim(),
      descripcion: data.descripcion?.trim() || null,
      precioBase: data.precioBase,
      activo: true,
      usos: 0,
      creadoEn: serverTimestamp(),
      actualizadoEn: serverTimestamp(),
    };

    const ref = await addDoc(collection(db, COL), payload);
    const snap = await getDoc(ref);
    return mapServicio(ref.id, snap.data() as Record<string, unknown>);
  },

  update: async (id, data) => {
    const ref = doc(db, COL, id);
    const actual = await getDoc(ref);

    if (!actual.exists()) {
      throw new Error(`Servicio de catálogo ${id} no encontrado`);
    }

    if (data.nombre !== undefined && !data.nombre.trim()) {
      throw new Error("El nombre no puede estar vacío");
    }
    if (data.precioBase !== undefined && data.precioBase < 0) {
      throw new Error("El precio base debe ser 0 o mayor");
    }

    const payload: Record<string, unknown> = {
      actualizadoEn: serverTimestamp(),
    };

    if (data.nombre !== undefined) payload.nombre = data.nombre.trim();
    if (data.descripcion !== undefined) {
      payload.descripcion = data.descripcion.trim() || null;
    }
    if (data.precioBase !== undefined) payload.precioBase = data.precioBase;
    if (data.activo !== undefined) payload.activo = data.activo;

    await updateDoc(ref, payload);
    const updated = await getDoc(ref);
    return mapServicio(id, updated.data() as Record<string, unknown>);
  },

  remove: async (id) => {
    // soft delete (mismo comportamiento por defecto que Nest)
    return get().update(id, { activo: false });
  },

  destroy: async (id) => {
    const ref = doc(db, COL, id);
    const actual = await getDoc(ref);

    if (!actual.exists()) {
      throw new Error(`Servicio de catálogo ${id} no encontrado`);
    }

    const usos = await countUsosEnOrdenes(id);
    if (usos > 0) {
      // si ya se usó, solo desactivar
      await updateDoc(ref, {
        activo: false,
        actualizadoEn: serverTimestamp(),
      });
      return;
    }

    await deleteDoc(ref);
  },
}));
