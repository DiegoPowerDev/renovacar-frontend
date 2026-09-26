// src/stores/useOrdenesStore.ts
import { create } from "zustand";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  runTransaction,
  Unsubscribe,
  deleteDoc,
  addDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/firebase/config";

// ======================
// TYPES
// ======================
export type EstadoOT =
  | "BORRADOR"
  | "COTIZADA"
  | "EN_PROCESO"
  | "CONTROL_CALIDAD"
  | "LISTO"
  | "ENTREGADO"
  | "CANCELADA";
export type MetodoPago =
  | "EFECTIVO"
  | "YAPE"
  | "PLIN"
  | "TRANSFERENCIA"
  | "TARJETA"
  | "OTRO";

export type Pago = {
  id: string;
  monto: number;
  metodo: MetodoPago;
  fecha: Date | null;
  comprobante?: string | null;
  observaciones?: string | null;
  registradoPor?: string | null;
  creadoEn?: Date | null;
};

export type RegistrarPagoInput = {
  numeroOT: string;
  monto: number;
  metodo: string;
  comprobante?: string;
  observaciones?: string;
  fecha?: string;
  registradoPor?: string;
};

export type ResumenPagos = {
  numero: string;
  total: number;
  totalPagado: number;
  saldoPendiente: number;
  estado: string;
  estadoCotizacion: string;
  cliente: string;
  placa: string;
  pagos: Pago[];
};

const METODOS_VALIDOS: MetodoPago[] = [
  "EFECTIVO",
  "YAPE",
  "PLIN",
  "TRANSFERENCIA",
  "TARJETA",
  "OTRO",
];

type EtapaDoc = {
  id: string;
  nombre?: string;
  secuencia?: number;
  estado?: string;
  responsable?: string | null;
  fechaInicio?: unknown;
  fechaFin?: unknown;
  observaciones?: string | null;
};

export type EstadoCotizacion =
  | "BORRADOR"
  | "ENVIADA"
  | "ACEPTADA"
  | "RECHAZADA";

export type ControlCalidadInput = {
  numeroOT: string;
  aprobado: boolean;
  observaciones?: string;
  inspector?: string;
};

export type EntregaInput = {
  numeroOT: string;
  entregadoPor?: string;
  recibidoPor: string;
  kilometraje?: number;
  observaciones?: string;
  conformidad?: boolean;
};

export type EstadoFinalOT = {
  numero: string;
  estado: string;
  placa: string;
  cliente: string;
  total: number;
  totalPagado: number;
  saldoPendiente: number;
  controlCalidad: OrdenTrabajo["controlCalidad"];
  entrega: OrdenTrabajo["entrega"];
  etapasCompletadas: number;
  totalEtapas: number;
};

export type OrdenTrabajo = {
  id: string;
  numero: string;
  placa: string;
  vehiculoId: string;
  clienteId: string;
  clienteNombre?: string | null;
  marca?: string | null;
  modelo?: string | null;

  fechaIngreso?: Date | null;
  fechaPrometida?: Date | null;
  estado: EstadoOT;
  observaciones?: string | null;
  kilometraje?: number | null;
  nivelCombustible?: string | null;

  estadoCotizacion: EstadoCotizacion;
  subtotal: number;
  descuentoTotal: number;
  total: number;
  totalPagado: number;
  saldoPendiente: number;

  controlCalidad?: {
    aprobado: boolean;
    observaciones?: string | null;
    inspector?: string | null;
    fecha?: Date | null;
  } | null;

  entrega?: {
    fecha?: Date | null;
    hora?: string | null;
    entregadoPor?: string | null;
    recibidoPor?: string | null;
    kilometraje?: number | null;
    observaciones?: string | null;
    conformidad?: boolean;
  } | null;

  creadoEn?: Date | null;
  actualizadoEn?: Date | null;
};

export type CrearOrdenInput = {
  placa: string;
  fechaPrometida?: string;
  observaciones?: string;
  kilometraje?: number;
  nivelCombustible?: string;
};

export type EstadoEtapa = "PENDIENTE" | "EN_PROCESO" | "PAUSADO" | "TERMINADO";

export type EtapaProduccion = {
  id: string;
  nombre: string;
  secuencia: number;
  estado: EstadoEtapa;
  responsable?: string | null;
  fechaInicio?: Date | null;
  fechaFin?: Date | null;
  observaciones?: string | null;
};

export type ResumenEtapasOT = {
  numero: string;
  placa: string;
  cliente: string;
  estadoOT: string;
  etapas: EtapaProduccion[];
};

const PLANTILLAS: Record<string, string[]> = {
  PINTURA: [
    "RECEPCIÓN",
    "DESARMADO",
    "PLANCHADO",
    "PREPARACIÓN",
    "PINTURA",
    "SECADO",
    "ARMADO",
    "PULIDO",
    "CONTROL DE CALIDAD",
    "LISTO PARA ENTREGA",
  ],
  DETAILING: [
    "RECEPCIÓN",
    "LAVADO",
    "DESCONTAMINACIÓN",
    "PULIDO",
    "PROTECCIÓN",
    "CONTROL DE CALIDAD",
    "LISTO PARA ENTREGA",
  ],
  GENERAL: [
    "RECEPCIÓN",
    "DIAGNÓSTICO",
    "REPARACIÓN",
    "CONTROL DE CALIDAD",
    "LISTO PARA ENTREGA",
  ],
};

type OrdenesState = {
  ordenes: OrdenTrabajo[];
  loading: boolean;
  error: string | null;
  _unsubscribe: Unsubscribe | null;

  subscribe: () => void;
  unsubscribe: () => void;

  crearDesdePlaca: (data: CrearOrdenInput) => Promise<OrdenTrabajo>;
  findByNumero: (numero: string) => Promise<OrdenTrabajo | null>;
  findByPlaca: (placa: string) => Promise<OrdenTrabajo[]>;
  cambiarEstado: (numero: string, estado: EstadoOT) => Promise<OrdenTrabajo>;
  registrarControlCalidad: (
    data: ControlCalidadInput,
  ) => Promise<EstadoFinalOT>;
  registrarEntrega: (data: EntregaInput) => Promise<EstadoFinalOT>;
  obtenerEstadoFinal: (numeroOT: string) => Promise<EstadoFinalOT>;
  registrarPago: (data: RegistrarPagoInput) => Promise<ResumenPagos>;
  eliminarPago: (numeroOT: string, pagoId: string) => Promise<ResumenPagos>;
  obtenerResumenPagos: (numeroOT: string) => Promise<ResumenPagos>;
  generarEtapas: (numeroOT: string, tipo?: string) => Promise<ResumenEtapasOT>;
  obtenerEtapas: (numeroOT: string) => Promise<ResumenEtapasOT>;
  iniciarEtapa: (
    numeroOT: string,
    etapaId: string,
    responsable?: string,
  ) => Promise<EtapaProduccion>;
  pausarEtapa: (
    numeroOT: string,
    etapaId: string,
    observaciones?: string,
  ) => Promise<EtapaProduccion>;
  terminarEtapa: (
    numeroOT: string,
    etapaId: string,
    observaciones?: string,
  ) => Promise<EtapaProduccion>;
  asignarResponsable: (
    numeroOT: string,
    etapaId: string,
    responsable: string,
  ) => Promise<EtapaProduccion>;
  dashboardProduccion: () => Promise<Record<string, any[]>>;
};

const COL = "ordenes";
const COL_VEHICULOS = "vehiculos";
const CONTADOR_REF = doc(db, "contadores", "ot");

const ESTADOS_VALIDOS: EstadoOT[] = [
  "BORRADOR",
  "COTIZADA",
  "EN_PROCESO",
  "CONTROL_CALIDAD",
  "LISTO",
  "ENTREGADO",
  "CANCELADA",
];

// ======================
// HELPERS
// ======================
function normalizarPlaca(placa: string) {
  return placa.toUpperCase().trim();
}
async function getEtapas(ordenId: string): Promise<EtapaDoc[]> {
  const snap = await getDocs(collection(db, COL, ordenId, "etapas"));
  return snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      nombre: data.nombre as string | undefined,
      secuencia: data.secuencia as number | undefined,
      estado: data.estado as string | undefined,
      responsable: (data.responsable as string) || null,
      fechaInicio: data.fechaInicio,
      fechaFin: data.fechaFin,
      observaciones: (data.observaciones as string) || null,
    };
  });
}

async function buildEstadoFinal(orden: OrdenTrabajo): Promise<EstadoFinalOT> {
  const etapas = await getEtapas(orden.id);
  const completadas = etapas.filter((e) => e.estado === "TERMINADO").length;

  return {
    numero: orden.numero,
    estado: orden.estado,
    placa: orden.placa,
    cliente: orden.clienteNombre || "",
    total: orden.total,
    totalPagado: orden.totalPagado,
    saldoPendiente: orden.saldoPendiente,
    controlCalidad: orden.controlCalidad,
    entrega: orden.entrega,
    etapasCompletadas: completadas,
    totalEtapas: etapas.length,
  };
}

function mapPago(id: string, data: Record<string, unknown>): Pago {
  return {
    id,
    monto: Number(data.monto) || 0,
    metodo: (data.metodo as MetodoPago) || "OTRO",
    fecha: toDate(data.fecha),
    comprobante: (data.comprobante as string) || null,
    observaciones: (data.observaciones as string) || null,
    registradoPor: (data.registradoPor as string) || null,
    creadoEn: toDate(data.creadoEn),
  };
}

async function listPagos(ordenId: string): Promise<Pago[]> {
  const snap = await getDocs(
    query(collection(db, COL, ordenId, "pagos"), orderBy("fecha", "asc")),
  );
  return snap.docs.map((d) =>
    mapPago(d.id, d.data() as Record<string, unknown>),
  );
}

async function recalcularPagos(ordenId: string, totalOT: number) {
  const pagos = await listPagos(ordenId);
  const totalPagado = pagos.reduce((acc, p) => acc + p.monto, 0);
  const saldoPendiente = Math.max(totalOT - totalPagado, 0);

  await updateDoc(doc(db, COL, ordenId), {
    totalPagado,
    saldoPendiente,
    actualizadoEn: serverTimestamp(),
  });

  return { totalPagado, saldoPendiente, pagos };
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return new Date(value as string);
}

function mapOrden(id: string, data: Record<string, unknown>): OrdenTrabajo {
  const cc = data.controlCalidad as Record<string, unknown> | null | undefined;
  const ent = data.entrega as Record<string, unknown> | null | undefined;

  return {
    id,
    numero: (data.numero as string) || "",
    placa: (data.placa as string) || "",
    vehiculoId: (data.vehiculoId as string) || "",
    clienteId: (data.clienteId as string) || "",
    clienteNombre: (data.clienteNombre as string) || null,
    marca: (data.marca as string) || null,
    modelo: (data.modelo as string) || null,
    fechaIngreso: toDate(data.fechaIngreso),
    fechaPrometida: toDate(data.fechaPrometida),
    estado: (data.estado as EstadoOT) || "BORRADOR",
    observaciones: (data.observaciones as string) || null,
    kilometraje: (data.kilometraje as number) ?? null,
    nivelCombustible: (data.nivelCombustible as string) || null,
    estadoCotizacion: (data.estadoCotizacion as EstadoCotizacion) || "BORRADOR",
    subtotal: Number(data.subtotal) || 0,
    descuentoTotal: Number(data.descuentoTotal) || 0,
    total: Number(data.total) || 0,
    totalPagado: Number(data.totalPagado) || 0,
    saldoPendiente: Number(data.saldoPendiente) || 0,
    controlCalidad: cc
      ? {
          aprobado: !!cc.aprobado,
          observaciones: (cc.observaciones as string) || null,
          inspector: (cc.inspector as string) || null,
          fecha: toDate(cc.fecha),
        }
      : null,
    entrega: ent
      ? {
          fecha: toDate(ent.fecha),
          hora: (ent.hora as string) || null,
          entregadoPor: (ent.entregadoPor as string) || null,
          recibidoPor: (ent.recibidoPor as string) || null,
          kilometraje: (ent.kilometraje as number) ?? null,
          observaciones: (ent.observaciones as string) || null,
          conformidad: !!ent.conformidad,
        }
      : null,
    creadoEn: toDate(data.creadoEn),
    actualizadoEn: toDate(data.actualizadoEn),
  };
}

/** OT-2026-000001 con contador atómico */
async function generarNumeroOT(): Promise<string> {
  const anio = new Date().getFullYear();

  const seq = await runTransaction(db, async (tx) => {
    const snap = await tx.get(CONTADOR_REF);

    if (!snap.exists()) {
      tx.set(CONTADOR_REF, { anio, seq: 1 });
      return 1;
    }

    const data = snap.data();
    const anioDoc = data.anio as number;
    let siguiente = 1;

    if (anioDoc === anio) {
      siguiente = (Number(data.seq) || 0) + 1;
      tx.update(CONTADOR_REF, { seq: siguiente });
    } else {
      // nuevo año → reinicia secuencia
      tx.set(CONTADOR_REF, { anio, seq: 1 });
      siguiente = 1;
    }

    return siguiente;
  });

  return `OT-${anio}-${seq.toString().padStart(6, "0")}`;
}

async function findOrdenDocByNumero(numero: string) {
  const q = query(collection(db, COL), where("numero", "==", numero));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0];
}

function mapEtapa(id: string, data: Record<string, unknown>): EtapaProduccion {
  return {
    id,
    nombre: (data.nombre as string) || "",
    secuencia: Number(data.secuencia) || 0,
    estado: (data.estado as EstadoEtapa) || "PENDIENTE",
    responsable: (data.responsable as string) || null,
    fechaInicio: toDate(data.fechaInicio),
    fechaFin: toDate(data.fechaFin),
    observaciones: (data.observaciones as string) || null,
  };
}

async function listEtapasOrdered(ordenId: string): Promise<EtapaProduccion[]> {
  const snap = await getDocs(
    query(collection(db, COL, ordenId, "etapas"), orderBy("secuencia", "asc")),
  );
  return snap.docs.map((d) =>
    mapEtapa(d.id, d.data() as Record<string, unknown>),
  );
}

async function getEtapaRef(ordenId: string, etapaId: string) {
  const ref = doc(db, COL, ordenId, "etapas", etapaId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error("Etapa no encontrada");
  }
  return {
    ref,
    etapa: mapEtapa(snap.id, snap.data() as Record<string, unknown>),
  };
}

// ======================
// STORE
// ======================
export const useOrdenesStore = create<OrdenesState>((set, get) => ({
  ordenes: [],
  loading: true,
  error: null,
  _unsubscribe: null,

  subscribe: () => {
    get().unsubscribe();
    set({ loading: true, error: null });

    const q = query(collection(db, COL), orderBy("fechaIngreso", "desc"));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const ordenes = snapshot.docs.map((d) =>
          mapOrden(d.id, d.data() as Record<string, unknown>),
        );
        set({ ordenes, loading: false, error: null });
      },
      (err) => {
        console.error("Error ordenes onSnapshot:", err);
        set({
          loading: false,
          error: err.message || "Error al cargar órdenes",
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

  crearDesdePlaca: async (data) => {
    const placa = normalizarPlaca(data.placa);

    // 1. Vehículo (id = placa)
    const vehSnap = await getDoc(doc(db, COL_VEHICULOS, placa));
    if (!vehSnap.exists()) {
      throw new Error(`No existe un vehículo con la placa ${placa}`);
    }

    const veh = vehSnap.data() as Record<string, unknown>;
    const clienteId = (veh.clienteId as string) || "";
    const clienteNombre = (veh.clienteNombre as string) || null;

    // 2. Número OT
    const numero = await generarNumeroOT();

    // 3. Crear OT (id del doc = numero para buscar fácil, o auto-id)
    const ref = doc(db, COL, numero);

    const payload = {
      numero,
      placa,
      vehiculoId: placa,
      clienteId,
      clienteNombre,
      marca: (veh.marca as string) || null,
      modelo: (veh.modelo as string) || null,

      fechaIngreso: serverTimestamp(),
      fechaPrometida: data.fechaPrometida
        ? Timestamp.fromDate(new Date(data.fechaPrometida))
        : null,
      estado: "BORRADOR" as EstadoOT,
      observaciones: data.observaciones?.trim() || null,
      kilometraje: data.kilometraje ?? null,
      nivelCombustible: data.nivelCombustible?.trim() || null,

      estadoCotizacion: "BORRADOR" as EstadoCotizacion,
      subtotal: 0,
      descuentoTotal: 0,
      total: 0,
      totalPagado: 0,
      saldoPendiente: 0,

      controlCalidad: null,
      entrega: null,

      creadoEn: serverTimestamp(),
      actualizadoEn: serverTimestamp(),
    };

    await setDoc(ref, payload);

    const snap = await getDoc(ref);
    return mapOrden(ref.id, snap.data() as Record<string, unknown>);
  },

  findByNumero: async (numero) => {
    // Si el id del doc es el numero:
    const byId = await getDoc(doc(db, COL, numero));
    if (byId.exists()) {
      return mapOrden(byId.id, byId.data() as Record<string, unknown>);
    }

    const found = await findOrdenDocByNumero(numero);
    if (!found) return null;
    return mapOrden(found.id, found.data() as Record<string, unknown>);
  },

  findByPlaca: async (placa) => {
    const placaNorm = normalizarPlaca(placa);
    const q = query(
      collection(db, COL),
      where("placa", "==", placaNorm),
      orderBy("fechaIngreso", "desc"),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) =>
      mapOrden(d.id, d.data() as Record<string, unknown>),
    );
  },

  cambiarEstado: async (numero, nuevoEstado) => {
    if (!ESTADOS_VALIDOS.includes(nuevoEstado)) {
      throw new Error(`Estado inválido: ${nuevoEstado}`);
    }

    const orden = await get().findByNumero(numero);
    if (!orden) {
      throw new Error(`No se encontró la orden ${numero}`);
    }

    const ref = doc(db, COL, orden.id);
    await updateDoc(ref, {
      estado: nuevoEstado,
      actualizadoEn: serverTimestamp(),
    });

    const snap = await getDoc(ref);
    return mapOrden(orden.id, snap.data() as Record<string, unknown>);
  },
  obtenerEstadoFinal: async (numeroOT) => {
    const orden = await get().findByNumero(numeroOT);
    if (!orden) {
      throw new Error(`Orden ${numeroOT} no encontrada`);
    }
    return buildEstadoFinal(orden);
  },

  registrarControlCalidad: async (data) => {
    const orden = await get().findByNumero(data.numeroOT);
    if (!orden) {
      throw new Error(`Orden ${data.numeroOT} no encontrada`);
    }

    // Todas las etapas terminadas
    const etapas = await getEtapas(orden.id);
    const pendientes = etapas.filter((e) => e.estado !== "TERMINADO");
    if (pendientes.length > 0) {
      throw new Error(
        `Aún hay ${pendientes.length} etapa(s) sin terminar. No se puede hacer control de calidad.`,
      );
    }

    const controlCalidad = {
      aprobado: data.aprobado,
      observaciones: data.observaciones?.trim() || null,
      inspector: data.inspector?.trim() || null,
      fecha: Timestamp.now(),
    };

    const nuevoEstado = data.aprobado ? "LISTO" : "EN_PROCESO";

    await updateDoc(doc(db, COL, orden.id), {
      controlCalidad,
      estado: nuevoEstado,
      actualizadoEn: serverTimestamp(),
    });

    const actualizada = await get().findByNumero(data.numeroOT);
    if (!actualizada) {
      throw new Error(`Orden ${data.numeroOT} no encontrada`);
    }
    return buildEstadoFinal(actualizada);
  },

  registrarEntrega: async (data) => {
    if (!data.recibidoPor?.trim()) {
      throw new Error("Debe indicar quién recibe el vehículo");
    }

    const orden = await get().findByNumero(data.numeroOT);
    if (!orden) {
      throw new Error(`Orden ${data.numeroOT} no encontrada`);
    }

    if (!orden.controlCalidad?.aprobado) {
      throw new Error(
        "No se puede entregar: el control de calidad no está aprobado",
      );
    }

    if (orden.saldoPendiente > 0) {
      throw new Error(
        `No se puede entregar: hay un saldo pendiente de S/ ${orden.saldoPendiente.toFixed(2)}`,
      );
    }

    if (orden.entrega) {
      throw new Error("Esta orden ya fue entregada");
    }

    const ahora = new Date();
    const hora = ahora.toLocaleTimeString("es-PE", { hour12: false });

    const entrega = {
      fecha: Timestamp.now(),
      hora,
      entregadoPor: data.entregadoPor?.trim() || null,
      recibidoPor: data.recibidoPor.trim(),
      kilometraje: data.kilometraje ?? null,
      observaciones: data.observaciones?.trim() || null,
      conformidad: data.conformidad ?? true,
    };

    await updateDoc(doc(db, COL, orden.id), {
      entrega,
      estado: "ENTREGADO",
      actualizadoEn: serverTimestamp(),
    });

    const actualizada = await get().findByNumero(data.numeroOT);
    if (!actualizada) {
      throw new Error(`Orden ${data.numeroOT} no encontrada`);
    }
    return buildEstadoFinal(actualizada);
  },
  obtenerResumenPagos: async (numeroOT) => {
    const orden = await get().findByNumero(numeroOT);
    if (!orden) {
      throw new Error(`Orden ${numeroOT} no encontrada`);
    }

    const pagos = await listPagos(orden.id);

    return {
      numero: orden.numero,
      total: orden.total,
      totalPagado: orden.totalPagado,
      saldoPendiente: orden.saldoPendiente,
      estado: orden.estado,
      estadoCotizacion: orden.estadoCotizacion,
      cliente: orden.clienteNombre || "",
      placa: orden.placa,
      pagos,
    };
  },

  registrarPago: async (data) => {
    const metodo = data.metodo.toUpperCase() as MetodoPago;

    if (!METODOS_VALIDOS.includes(metodo)) {
      throw new Error(
        `Método de pago inválido. Usa: ${METODOS_VALIDOS.join(", ")}`,
      );
    }

    if (data.monto <= 0) {
      throw new Error("El monto debe ser mayor a 0");
    }

    const orden = await get().findByNumero(data.numeroOT);
    if (!orden) {
      throw new Error(`Orden ${data.numeroOT} no encontrada`);
    }

    await addDoc(collection(db, COL, orden.id, "pagos"), {
      monto: data.monto,
      metodo,
      comprobante: data.comprobante?.trim() || null,
      observaciones: data.observaciones?.trim() || null,
      registradoPor: data.registradoPor?.trim() || null,
      fecha: data.fecha
        ? Timestamp.fromDate(new Date(data.fecha))
        : Timestamp.now(),
      creadoEn: serverTimestamp(),
    });

    await recalcularPagos(orden.id, orden.total);

    return get().obtenerResumenPagos(data.numeroOT);
  },

  eliminarPago: async (numeroOT, pagoId) => {
    const orden = await get().findByNumero(numeroOT);
    if (!orden) {
      throw new Error(`Orden ${numeroOT} no encontrada`);
    }

    const pagoRef = doc(db, COL, orden.id, "pagos", pagoId);
    const pagoSnap = await getDoc(pagoRef);
    if (!pagoSnap.exists()) {
      throw new Error("Pago no encontrado");
    }

    await deleteDoc(pagoRef);
    await recalcularPagos(orden.id, orden.total);

    return get().obtenerResumenPagos(numeroOT);
  },
  obtenerEtapas: async (numeroOT) => {
    const orden = await get().findByNumero(numeroOT);
    if (!orden) {
      throw new Error(`Orden ${numeroOT} no encontrada`);
    }

    const etapas = await listEtapasOrdered(orden.id);

    return {
      numero: orden.numero,
      placa: orden.placa,
      cliente: orden.clienteNombre || "",
      estadoOT: orden.estado,
      etapas,
    };
  },

  generarEtapas: async (numeroOT, tipo = "GENERAL") => {
    const orden = await get().findByNumero(numeroOT);
    if (!orden) {
      throw new Error(`Orden ${numeroOT} no encontrada`);
    }

    const existentes = await listEtapasOrdered(orden.id);
    if (existentes.length > 0) {
      throw new Error("Esta orden ya tiene etapas generadas");
    }

    const plantilla = PLANTILLAS[tipo.toUpperCase()] || PLANTILLAS.GENERAL;

    const batch = writeBatch(db);
    plantilla.forEach((nombre, index) => {
      const ref = doc(collection(db, COL, orden.id, "etapas"));
      batch.set(ref, {
        nombre,
        secuencia: index + 1,
        estado: "PENDIENTE",
        responsable: null,
        fechaInicio: null,
        fechaFin: null,
        observaciones: null,
        creadoEn: serverTimestamp(),
        actualizadoEn: serverTimestamp(),
      });
    });
    await batch.commit();

    if (["BORRADOR", "COTIZADA"].includes(orden.estado)) {
      await updateDoc(doc(db, COL, orden.id), {
        estado: "EN_PROCESO",
        actualizadoEn: serverTimestamp(),
      });
    }

    return get().obtenerEtapas(numeroOT);
  },

  iniciarEtapa: async (numeroOT, etapaId, responsable) => {
    const orden = await get().findByNumero(numeroOT);
    if (!orden) throw new Error(`Orden ${numeroOT} no encontrada`);

    const { ref, etapa } = await getEtapaRef(orden.id, etapaId);

    if (etapa.estado === "TERMINADO") {
      throw new Error("Esta etapa ya está terminada");
    }

    await updateDoc(ref, {
      estado: "EN_PROCESO",
      fechaInicio: etapa.fechaInicio
        ? Timestamp.fromDate(etapa.fechaInicio)
        : Timestamp.now(),
      responsable: responsable?.trim() || etapa.responsable || null,
      actualizadoEn: serverTimestamp(),
    });

    const snap = await getDoc(ref);
    return mapEtapa(etapaId, snap.data() as Record<string, unknown>);
  },

  pausarEtapa: async (numeroOT, etapaId, observaciones) => {
    const orden = await get().findByNumero(numeroOT);
    if (!orden) throw new Error(`Orden ${numeroOT} no encontrada`);

    const { ref, etapa } = await getEtapaRef(orden.id, etapaId);

    if (etapa.estado !== "EN_PROCESO") {
      throw new Error("Solo se puede pausar una etapa en proceso");
    }

    await updateDoc(ref, {
      estado: "PAUSADO",
      observaciones: observaciones?.trim() || etapa.observaciones || null,
      actualizadoEn: serverTimestamp(),
    });

    const snap = await getDoc(ref);
    return mapEtapa(etapaId, snap.data() as Record<string, unknown>);
  },

  terminarEtapa: async (numeroOT, etapaId, observaciones) => {
    const orden = await get().findByNumero(numeroOT);
    if (!orden) throw new Error(`Orden ${numeroOT} no encontrada`);

    const { ref, etapa } = await getEtapaRef(orden.id, etapaId);
    if (etapa.estado === "TERMINADO") {
      throw new Error("Esta etapa ya está terminada");
    }

    await updateDoc(ref, {
      estado: "TERMINADO",
      fechaFin: Timestamp.now(),
      observaciones: observaciones?.trim() || etapa.observaciones || null,
      actualizadoEn: serverTimestamp(),
    });

    const despues = await listEtapasOrdered(orden.id);
    if (despues.every((e) => e.estado === "TERMINADO")) {
      await updateDoc(doc(db, COL, orden.id), {
        estado: "CONTROL_CALIDAD",
        actualizadoEn: serverTimestamp(),
      });
    }

    const snap = await getDoc(ref);
    return mapEtapa(etapaId, snap.data() as Record<string, unknown>);
  },

  asignarResponsable: async (numeroOT, etapaId, responsable) => {
    const orden = await get().findByNumero(numeroOT);
    if (!orden) throw new Error(`Orden ${numeroOT} no encontrada`);

    const { ref } = await getEtapaRef(orden.id, etapaId);

    await updateDoc(ref, {
      responsable: responsable.trim(),
      actualizadoEn: serverTimestamp(),
    });

    const snap = await getDoc(ref);
    return mapEtapa(etapaId, snap.data() as Record<string, unknown>);
  },

  dashboardProduccion: async () => {
    // Con subcolecciones no hay query global barata.
    // Con ~5 usuarios: leemos OTs activas y sus etapas.
    const estadosActivos = [
      "EN_PROCESO",
      "CONTROL_CALIDAD",
      "LISTO",
      "COTIZADA",
    ];
    const ordenesSnap = await getDocs(collection(db, COL));
    const resumen: Record<string, any[]> = {};

    for (const d of ordenesSnap.docs) {
      const orden = mapOrden(d.id, d.data() as Record<string, unknown>);
      if (
        !estadosActivos.includes(orden.estado) &&
        orden.estado !== "BORRADOR"
      ) {
        // opcional: igual revisamos etapas no terminadas
      }

      const etapas = await listEtapasOrdered(orden.id);
      for (const etapa of etapas) {
        if (!["EN_PROCESO", "PAUSADO", "PENDIENTE"].includes(etapa.estado)) {
          continue;
        }
        if (!resumen[etapa.nombre]) resumen[etapa.nombre] = [];
        resumen[etapa.nombre].push({
          etapaId: etapa.id,
          estado: etapa.estado,
          responsable: etapa.responsable,
          ot: orden.numero,
          placa: orden.placa,
          vehiculo: `${orden.marca || ""} ${orden.modelo || ""}`.trim(),
        });
      }
    }

    return resumen;
  },
}));
