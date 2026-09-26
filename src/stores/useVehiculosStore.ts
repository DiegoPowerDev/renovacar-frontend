// src/stores/useVehiculosStore.ts
import { create } from "zustand";
import {
  collection,
  doc,
  setDoc,
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
  writeBatch,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import type { Cliente } from "@/stores/useClientesStore";

// ======================
// TYPES
// ======================
export type Vehiculo = {
  id: string; // = placa
  placa: string;
  marca: string;
  modelo: string;
  anio?: number | null;
  color?: string | null;
  vin?: string | null;
  clienteId: string;
  clienteNombre?: string | null;
  cliente?: Cliente | null;
  creadoEn?: Date | null;
  actualizadoEn?: Date | null;
};

export type VehiculoCreateInput = {
  placa: string;
  marca: string;
  modelo: string;
  anio?: number;
  color?: string;
  vin?: string;
  clienteId?: string;
  dniRuc?: string;
  cliente?: {
    nombre: string;
    dniRuc?: string;
    telefono?: string;
    whatsapp?: string;
    correo?: string;
  };
};

export type VehiculoUpdateInput = {
  placa?: string;
  marca?: string;
  modelo?: string;
  anio?: number;
  color?: string;
  vin?: string;
};

type VehiculosState = {
  vehiculos: Vehiculo[];
  loading: boolean;
  error: string | null;
  _unsubscribe: Unsubscribe | null;

  subscribe: () => void;
  unsubscribe: () => void;

  create: (data: VehiculoCreateInput) => Promise<Vehiculo>;
  update: (id: string, data: VehiculoUpdateInput) => Promise<Vehiculo>;
  remove: (id: string) => Promise<void>;

  findByPlaca: (placa: string) => Promise<Vehiculo | null>;
  historialCompleto: (placa: string) => Promise<HistorialPlaca>;
};

export type HistorialPlaca = {
  vehiculo: {
    id: string;
    placa: string;
    marca: string;
    modelo: string;
    anio?: number | null;
    color?: string | null;
    vin?: string | null;
  };
  propietario: {
    id: string;
    nombre: string;
    dniRuc?: string | null;
    telefono?: string | null;
    whatsapp?: string | null;
    correo?: string | null;
  };
  resumen: {
    totalOrdenes: number;
    ordenesEntregadas: number;
    ordenesEnProceso: number;
    totalFacturado: number;
    totalCobrado: number;
    saldoGeneral: number;
  };
  historial: Array<{
    fecha: Date | null;
    numero: string;
    servicios: string;
    total: number;
    totalPagado: number;
    saldoPendiente: number;
    estado: string;
    estadoCotizacion: string;
    tieneControlCalidad: boolean;
    aprobadoCalidad: boolean;
    entregado: boolean;
    fechaEntrega: Date | null;
  }>;
  ordenesDetalle: unknown[];
};

// ======================
// HELPERS
// ======================
const COL = "vehiculos";
const COL_CLIENTES = "clientes";
const COL_ORDENES = "ordenes";

function normalizarPlaca(placa: string) {
  return placa.toUpperCase().trim();
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return new Date(value as string);
}

function mapVehiculo(id: string, data: Record<string, unknown>): Vehiculo {
  return {
    id,
    placa: (data.placa as string) || id,
    marca: (data.marca as string) || "",
    modelo: (data.modelo as string) || "",
    anio: (data.anio as number) ?? null,
    color: (data.color as string) || null,
    vin: (data.vin as string) || null,
    clienteId: (data.clienteId as string) || "",
    clienteNombre: (data.clienteNombre as string) || null,
    creadoEn: toDate(data.creadoEn),
    actualizadoEn: toDate(data.actualizadoEn),
  };
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

async function getClienteDoc(clienteId: string) {
  const snap = await getDoc(doc(db, COL_CLIENTES, clienteId));
  if (!snap.exists()) return null;
  return mapCliente(snap.id, snap.data() as Record<string, unknown>);
}

async function resolveClienteId(data: VehiculoCreateInput): Promise<{
  clienteId: string;
  clienteNombre: string;
}> {
  // A) clienteId
  if (data.clienteId) {
    const cliente = await getClienteDoc(data.clienteId);
    if (!cliente) {
      throw new Error(`Cliente con ID ${data.clienteId} no encontrado`);
    }
    return { clienteId: cliente.id, clienteNombre: cliente.nombre };
  }

  // B) dniRuc existente
  if (data.dniRuc) {
    const q = query(
      collection(db, COL_CLIENTES),
      where("dniRuc", "==", data.dniRuc.trim()),
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      throw new Error(`No se encontró cliente con DNI/RUC ${data.dniRuc}`);
    }
    const d = snap.docs[0];
    const c = mapCliente(d.id, d.data() as Record<string, unknown>);
    return { clienteId: c.id, clienteNombre: c.nombre };
  }

  // C) crear / reutilizar cliente nuevo
  if (data.cliente?.nombre) {
    if (data.cliente.dniRuc) {
      const q = query(
        collection(db, COL_CLIENTES),
        where("dniRuc", "==", data.cliente.dniRuc.trim()),
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0];
        const c = mapCliente(d.id, d.data() as Record<string, unknown>);
        return { clienteId: c.id, clienteNombre: c.nombre };
      }
    }

    const nuevoRef = doc(collection(db, COL_CLIENTES));
    await setDoc(nuevoRef, {
      nombre: data.cliente.nombre.trim(),
      dniRuc: data.cliente.dniRuc?.trim() || null,
      telefono: data.cliente.telefono?.trim() || null,
      whatsapp: data.cliente.whatsapp?.trim() || null,
      correo: data.cliente.correo?.trim() || null,
      creadoEn: serverTimestamp(),
      actualizadoEn: serverTimestamp(),
    });

    return {
      clienteId: nuevoRef.id,
      clienteNombre: data.cliente.nombre.trim(),
    };
  }

  throw new Error(
    "Debes indicar clienteId, dniRuc o los datos de un cliente nuevo",
  );
}

async function countOrdenesByPlaca(placa: string) {
  const q = query(collection(db, COL_ORDENES), where("placa", "==", placa));
  const snap = await getDocs(q);
  return snap.size;
}

// ======================
// STORE
// ======================
export const useVehiculosStore = create<VehiculosState>((set, get) => ({
  vehiculos: [],
  loading: true,
  error: null,
  _unsubscribe: null,

  subscribe: () => {
    get().unsubscribe();
    set({ loading: true, error: null });

    const q = query(collection(db, COL), orderBy("creadoEn", "desc"));

    const unsub = onSnapshot(
      q,
      async (snapshot) => {
        const base = snapshot.docs.map((d) =>
          mapVehiculo(d.id, d.data() as Record<string, unknown>),
        );

        // opcional: enriquecer con cliente (N lecturas; con pocos vehículos OK)
        const vehiculos = await Promise.all(
          base.map(async (v) => {
            if (!v.clienteId) return v;
            const cliente = await getClienteDoc(v.clienteId);
            return {
              ...v,
              cliente,
              clienteNombre: cliente?.nombre || v.clienteNombre,
            };
          }),
        );

        set({ vehiculos, loading: false, error: null });
      },
      (err) => {
        console.error("Error vehiculos onSnapshot:", err);
        set({
          loading: false,
          error: err.message || "Error al cargar vehículos",
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

  findByPlaca: async (placa) => {
    const id = normalizarPlaca(placa);
    const snap = await getDoc(doc(db, COL, id));
    if (!snap.exists()) return null;
    const v = mapVehiculo(snap.id, snap.data() as Record<string, unknown>);
    const cliente = v.clienteId ? await getClienteDoc(v.clienteId) : null;
    return { ...v, cliente, clienteNombre: cliente?.nombre || v.clienteNombre };
  },

  create: async (data) => {
    if (!data.placa?.trim() || !data.marca?.trim() || !data.modelo?.trim()) {
      throw new Error("Placa, marca y modelo son obligatorios");
    }

    const placa = normalizarPlaca(data.placa);
    const ref = doc(db, COL, placa);
    const existe = await getDoc(ref);
    if (existe.exists()) {
      throw new Error(`Ya existe un vehículo con la placa ${placa}`);
    }

    const { clienteId, clienteNombre } = await resolveClienteId(data);

    const payload = {
      placa,
      marca: data.marca.trim(),
      modelo: data.modelo.trim(),
      anio: data.anio ?? null,
      color: data.color?.trim() || null,
      vin: data.vin?.trim() || null,
      clienteId,
      clienteNombre,
      creadoEn: serverTimestamp(),
      actualizadoEn: serverTimestamp(),
    };

    await setDoc(ref, payload);
    const snap = await getDoc(ref);
    const v = mapVehiculo(ref.id, snap.data() as Record<string, unknown>);
    const cliente = await getClienteDoc(clienteId);
    return { ...v, cliente };
  },

  update: async (id, data) => {
    // id actual = placa actual
    const refActual = doc(db, COL, id);
    const snap = await getDoc(refActual);
    if (!snap.exists()) {
      throw new Error(`Vehículo con ID ${id} no encontrado`);
    }

    const prev = snap.data() as Record<string, unknown>;
    let nuevaPlaca = id;

    if (data.placa) {
      nuevaPlaca = normalizarPlaca(data.placa);
      if (nuevaPlaca !== id) {
        const conflicto = await getDoc(doc(db, COL, nuevaPlaca));
        if (conflicto.exists()) {
          throw new Error(`Ya existe un vehículo con la placa ${nuevaPlaca}`);
        }
      }
    }

    const payload: Record<string, unknown> = {
      actualizadoEn: serverTimestamp(),
    };
    if (data.marca !== undefined) payload.marca = data.marca.trim();
    if (data.modelo !== undefined) payload.modelo = data.modelo.trim();
    if (data.anio !== undefined) payload.anio = data.anio ?? null;
    if (data.color !== undefined) payload.color = data.color?.trim() || null;
    if (data.vin !== undefined) payload.vin = data.vin?.trim() || null;
    if (data.placa !== undefined) payload.placa = nuevaPlaca;

    // Si cambió la placa, hay que recrear el doc (el id es la placa)
    if (nuevaPlaca !== id) {
      const batch = writeBatch(db);
      const nuevoRef = doc(db, COL, nuevaPlaca);
      batch.set(nuevoRef, {
        ...prev,
        ...payload,
        placa: nuevaPlaca,
      });
      batch.delete(refActual);
      await batch.commit();

      // Opcional: actualizar placa en órdenes (si ya existen)
      const ordenesSnap = await getDocs(
        query(collection(db, COL_ORDENES), where("placa", "==", id)),
      );
      const batchOrdenes = writeBatch(db);
      ordenesSnap.docs.forEach((d) => {
        batchOrdenes.update(d.ref, {
          placa: nuevaPlaca,
          vehiculoId: nuevaPlaca,
        });
      });
      if (!ordenesSnap.empty) await batchOrdenes.commit();

      const nuevoSnap = await getDoc(nuevoRef);
      const v = mapVehiculo(
        nuevaPlaca,
        nuevoSnap.data() as Record<string, unknown>,
      );
      const cliente = v.clienteId ? await getClienteDoc(v.clienteId) : null;
      return { ...v, cliente };
    }

    await updateDoc(refActual, payload);
    const updated = await getDoc(refActual);
    const v = mapVehiculo(id, updated.data() as Record<string, unknown>);
    const cliente = v.clienteId ? await getClienteDoc(v.clienteId) : null;
    return { ...v, cliente };
  },

  remove: async (id) => {
    const ref = doc(db, COL, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new Error(`Vehículo con ID ${id} no encontrado`);
    }

    const placa = (snap.data().placa as string) || id;
    const nOrdenes = await countOrdenesByPlaca(placa);
    if (nOrdenes > 0) {
      throw new Error(
        `No se puede eliminar: el vehículo tiene ${nOrdenes} orden(es) de trabajo asociada(s)`,
      );
    }

    await deleteDoc(ref);
  },

  historialCompleto: async (placa) => {
    const placaNorm = normalizarPlaca(placa);
    const vehiculo = await get().findByPlaca(placaNorm);
    if (!vehiculo) {
      throw new Error(`No se encontró vehículo con placa ${placa}`);
    }

    const cliente =
      vehiculo.cliente ||
      (vehiculo.clienteId ? await getClienteDoc(vehiculo.clienteId) : null);

    if (!cliente) {
      throw new Error("El vehículo no tiene cliente asociado");
    }

    const ordenesSnap = await getDocs(
      query(
        collection(db, COL_ORDENES),
        where("placa", "==", placaNorm),
        orderBy("fechaIngreso", "desc"),
      ),
    );

    const ordenesDetalle = await Promise.all(
      ordenesSnap.docs.map(async (d) => {
        const data = d.data();
        const [itemsSnap, pagosSnap, etapasSnap] = await Promise.all([
          getDocs(collection(db, COL_ORDENES, d.id, "items")),
          getDocs(collection(db, COL_ORDENES, d.id, "pagos")),
          getDocs(collection(db, COL_ORDENES, d.id, "etapas")),
        ]);

        return {
          id: d.id,
          ...data,
          fechaIngreso: toDate(data.fechaIngreso),
          items: itemsSnap.docs.map((i) => ({ id: i.id, ...i.data() })),
          pagos: pagosSnap.docs.map((p) => ({ id: p.id, ...p.data() })),
          etapas: etapasSnap.docs.map((e) => ({ id: e.id, ...e.data() })),
          controlCalidad: data.controlCalidad || null,
          entrega: data.entrega || null,
        };
      }),
    );

    const historial = ordenesDetalle.map((ot: any) => {
      const servicios =
        (ot.items || []).map((i: any) => i.nombre).join(", ") ||
        "Sin servicios";
      return {
        fecha: ot.fechaIngreso as Date | null,
        numero: ot.numero as string,
        servicios,
        total: Number(ot.total) || 0,
        totalPagado: Number(ot.totalPagado) || 0,
        saldoPendiente: Number(ot.saldoPendiente) || 0,
        estado: ot.estado as string,
        estadoCotizacion: ot.estadoCotizacion as string,
        tieneControlCalidad: !!ot.controlCalidad,
        aprobadoCalidad: ot.controlCalidad?.aprobado ?? false,
        entregado: !!ot.entrega,
        fechaEntrega: toDate(ot.entrega?.fecha),
      };
    });

    const totalFacturado = historial.reduce((a, o) => a + o.total, 0);
    const totalCobrado = historial.reduce((a, o) => a + o.totalPagado, 0);

    return {
      vehiculo: {
        id: vehiculo.id,
        placa: vehiculo.placa,
        marca: vehiculo.marca,
        modelo: vehiculo.modelo,
        anio: vehiculo.anio,
        color: vehiculo.color,
        vin: vehiculo.vin,
      },
      propietario: {
        id: cliente.id,
        nombre: cliente.nombre,
        dniRuc: cliente.dniRuc,
        telefono: cliente.telefono,
        whatsapp: cliente.whatsapp,
        correo: cliente.correo,
      },
      resumen: {
        totalOrdenes: historial.length,
        ordenesEntregadas: historial.filter((o) => o.estado === "ENTREGADO")
          .length,
        ordenesEnProceso: historial.filter((o) =>
          ["EN_PROCESO", "CONTROL_CALIDAD", "LISTO"].includes(o.estado),
        ).length,
        totalFacturado,
        totalCobrado,
        saldoGeneral: totalFacturado - totalCobrado,
      },
      historial,
      ordenesDetalle,
    };
  },
}));
