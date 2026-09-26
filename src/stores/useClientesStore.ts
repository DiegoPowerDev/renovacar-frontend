import { create } from "zustand";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
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
export type Cliente = {
  id: string;
  nombre: string;
  dniRuc?: string | null;
  telefono?: string | null;
  whatsapp?: string | null;
  correo?: string | null;
  creadoEn?: Date | null;
  actualizadoEn?: Date | null;
};

export type ClienteInput = {
  nombre: string;
  dniRuc?: string;
  telefono?: string;
  whatsapp?: string;
  correo?: string;
};

type ClientesState = {
  clientes: Cliente[];
  loading: boolean;
  error: string | null;
  _unsubscribe: Unsubscribe | null;

  // realtime
  subscribe: () => void;
  unsubscribe: () => void;

  // CRUD
  create: (data: ClienteInput) => Promise<Cliente>;
  update: (id: string, data: Partial<ClienteInput>) => Promise<Cliente>;
  remove: (id: string) => Promise<void>;

  // búsquedas puntuales (sin depender solo del array local)
  findById: (id: string) => Promise<Cliente | null>;
  findByDniRuc: (dniRuc: string) => Promise<Cliente | null>;
  findByTelefono: (telefono: string) => Promise<Cliente[]>;
  findByNombre: (nombre: string) => Promise<Cliente[]>;
};

// ======================
// HELPERS
// ======================
const COL = "clientes";

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return new Date(value as string);
}

function mapCliente(id: string, data: Record<string, unknown>): Cliente {
  return {
    id,
    nombre: (data.nombre as string) || "",
    dniRuc: (data.dniRuc as string) || null,
    telefono: (data.telefono as string) || null,
    whatsapp: (data.whatsapp as string) || null,
    correo: (data.correo as string) || null,
    creadoEn: toDate(data.creadoEn),
    actualizadoEn: toDate(data.actualizadoEn),
  };
}

async function assertDniLibre(dniRuc: string, excludeId?: string) {
  const q = query(collection(db, COL), where("dniRuc", "==", dniRuc));
  const snap = await getDocs(q);
  const conflicto = snap.docs.find((d) => d.id !== excludeId);
  if (conflicto) {
    throw new Error(`Ya existe un cliente con DNI/RUC ${dniRuc}`);
  }
}

async function countVehiculosDeCliente(clienteId: string) {
  const q = query(
    collection(db, "vehiculos"),
    where("clienteId", "==", clienteId),
  );
  const snap = await getDocs(q);
  return snap.size;
}

// ======================
// STORE
// ======================
export const useClientesStore = create<ClientesState>((set, get) => ({
  clientes: [],
  loading: true,
  error: null,
  _unsubscribe: null,

  // ----- Escucha en tiempo real -----
  subscribe: () => {
    // evitar doble suscripción
    get().unsubscribe();

    set({ loading: true, error: null });

    const q = query(collection(db, COL), orderBy("creadoEn", "desc"));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const clientes = snapshot.docs.map((d) =>
          mapCliente(d.id, d.data() as Record<string, unknown>),
        );
        set({
          clientes,
          loading: false,
          error: null,
        });
      },
      (err) => {
        console.error("Error clientes onSnapshot:", err);
        set({
          loading: false,
          error: err.message || "Error al cargar clientes",
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

  // ----- Crear -----
  create: async (data) => {
    if (!data.nombre?.trim()) {
      throw new Error("El nombre es obligatorio");
    }

    const dni = data.dniRuc?.trim() || undefined;
    if (dni) {
      await assertDniLibre(dni);
    }

    const payload = {
      nombre: data.nombre.trim(),
      dniRuc: dni || null,
      telefono: data.telefono?.trim() || null,
      whatsapp: data.whatsapp?.trim() || null,
      correo: data.correo?.trim() || null,
      creadoEn: serverTimestamp(),
      actualizadoEn: serverTimestamp(),
    };

    const ref = await addDoc(collection(db, COL), payload);
    const snap = await getDoc(ref);
    return mapCliente(ref.id, snap.data() as Record<string, unknown>);
  },

  // ----- Actualizar -----
  update: async (id, data) => {
    const ref = doc(db, COL, id);
    const actual = await getDoc(ref);

    if (!actual.exists()) {
      throw new Error(`Cliente con ID ${id} no encontrado`);
    }

    const prev = actual.data();

    if (data.dniRuc !== undefined) {
      const dni = data.dniRuc?.trim() || null;
      if (dni && dni !== prev.dniRuc) {
        await assertDniLibre(dni, id);
      }
    }

    const payload: Record<string, unknown> = {
      actualizadoEn: serverTimestamp(),
    };

    if (data.nombre !== undefined) payload.nombre = data.nombre.trim();
    if (data.dniRuc !== undefined) payload.dniRuc = data.dniRuc?.trim() || null;
    if (data.telefono !== undefined)
      payload.telefono = data.telefono?.trim() || null;
    if (data.whatsapp !== undefined)
      payload.whatsapp = data.whatsapp?.trim() || null;
    if (data.correo !== undefined) payload.correo = data.correo?.trim() || null;

    await updateDoc(ref, payload);

    const updated = await getDoc(ref);
    return mapCliente(id, updated.data() as Record<string, unknown>);
  },

  // ----- Eliminar -----
  remove: async (id) => {
    const ref = doc(db, COL, id);
    const actual = await getDoc(ref);

    if (!actual.exists()) {
      throw new Error(`Cliente con ID ${id} no encontrado`);
    }

    const nVehiculos = await countVehiculosDeCliente(id);
    if (nVehiculos > 0) {
      throw new Error(
        `No se puede eliminar el cliente porque tiene ${nVehiculos} vehículo(s) asociado(s)`,
      );
    }

    await deleteDoc(ref);
  },

  // ----- Búsquedas -----
  findById: async (id) => {
    const snap = await getDoc(doc(db, COL, id));
    if (!snap.exists()) return null;
    return mapCliente(snap.id, snap.data() as Record<string, unknown>);
  },

  findByDniRuc: async (dniRuc) => {
    const q = query(collection(db, COL), where("dniRuc", "==", dniRuc.trim()));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return mapCliente(d.id, d.data() as Record<string, unknown>);
  },

  findByTelefono: async (telefono) => {
    // Firestore no tiene "contains"; filtramos en cliente sobre el listado
    // o dos queries exactas. Para UX del dashboard, usamos el array local.
    const term = telefono.trim();
    const { clientes } = get();
    return clientes.filter(
      (c) => c.telefono?.includes(term) || c.whatsapp?.includes(term),
    );
  },

  findByNombre: async (nombre) => {
    const term = nombre.trim().toLowerCase();
    const { clientes } = get();
    return clientes.filter((c) => c.nombre?.toLowerCase().includes(term));
  },
}));
