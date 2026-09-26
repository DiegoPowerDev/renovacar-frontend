// src/stores/useStatsStore.ts
import { create } from "zustand";
import {
  collection,
  getDocs,
  getCountFromServer,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/firebase/config";

// ======================
// TYPES
// ======================
export type StatsFiltros = {
  desde?: string; // YYYY-MM-DD
  hasta?: string;
  estado?: string;
  placa?: string;
  clienteId?: string;
};

export type DashboardData = {
  resumen: {
    clientes: number;
    vehiculos: number;
    ordenes: number;
    enProceso: number;
    listas: number;
    entregadas: number;
    canceladas: number;
    borrador: number;
  };
  finanzas: {
    totalFacturado: number;
    totalCobrado: number;
    totalPorCobrar: number;
    margenCobrado: number;
  };
  porEstado: { estado: string; cantidad: number }[];
  vehiculosEnTaller: {
    total: number;
    porEtapa: {
      etapa: string;
      cantidad: number;
      vehiculos: any[];
    }[];
  };
  ventasPorDia: {
    fecha: string;
    facturado: number;
    cobrado: number;
    ordenes: number;
  }[];
  ultimasOrdenes: {
    numero: string;
    fecha: Date | null;
    estado: string;
    total: number;
    totalPagado: number;
    saldoPendiente: number;
    placa: string;
    vehiculo: string;
    cliente: string;
  }[];
};

export type ResumenRapido = {
  clientes: number;
  vehiculos: number;
  enProceso: number;
  listas: number;
  entregadas: number;
  porCobrar: number;
};

type StatsState = {
  data: DashboardData | null;
  resumen: ResumenRapido | null;
  loading: boolean;
  error: string | null;

  getDashboard: (filtros?: StatsFiltros) => Promise<DashboardData>;
  getResumenRapido: () => Promise<ResumenRapido>;
};

// ======================
// HELPERS
// ======================
function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return new Date(value as string);
}

function startOfDay(iso: string) {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(iso: string) {
  const d = new Date(iso);
  d.setHours(23, 59, 59, 999);
  return d;
}

type OrdenRaw = {
  id: string;
  numero: string;
  placa: string;
  clienteId: string;
  clienteNombre?: string;
  marca?: string;
  modelo?: string;
  estado: string;
  estadoCotizacion?: string;
  total: number;
  totalPagado: number;
  saldoPendiente: number;
  fechaIngreso: Date | null;
};

function mapOrden(id: string, data: Record<string, unknown>): OrdenRaw {
  return {
    id,
    numero: (data.numero as string) || id,
    placa: (data.placa as string) || "",
    clienteId: (data.clienteId as string) || "",
    clienteNombre: (data.clienteNombre as string) || "",
    marca: (data.marca as string) || "",
    modelo: (data.modelo as string) || "",
    estado: (data.estado as string) || "BORRADOR",
    estadoCotizacion: (data.estadoCotizacion as string) || "BORRADOR",
    total: Number(data.total) || 0,
    totalPagado: Number(data.totalPagado) || 0,
    saldoPendiente: Number(data.saldoPendiente) || 0,
    fechaIngreso: toDate(data.fechaIngreso),
  };
}

function filtrarOrdenes(ordenes: OrdenRaw[], filtros?: StatsFiltros) {
  if (!filtros) return ordenes;

  const desde = filtros.desde ? startOfDay(filtros.desde) : null;
  const hasta = filtros.hasta ? endOfDay(filtros.hasta) : null;
  const placaTerm = filtros.placa?.toUpperCase().trim();

  return ordenes.filter((ot) => {
    if (filtros.estado && ot.estado !== filtros.estado) return false;
    if (filtros.clienteId && ot.clienteId !== filtros.clienteId) return false;
    if (placaTerm && !ot.placa.includes(placaTerm)) return false;
    if (desde && ot.fechaIngreso && ot.fechaIngreso < desde) return false;
    if (hasta && ot.fechaIngreso && ot.fechaIngreso > hasta) return false;
    return true;
  });
}

// ======================
// STORE
// ======================
export const useStatsStore = create<StatsState>((set) => ({
  data: null,
  resumen: null,
  loading: false,
  error: null,

  getResumenRapido: async () => {
    set({ loading: true, error: null });
    try {
      const [clientesSnap, vehiculosSnap, ordenesSnap] = await Promise.all([
        getCountFromServer(collection(db, "clientes")),
        getCountFromServer(collection(db, "vehiculos")),
        getDocs(collection(db, "ordenes")),
      ]);

      const ordenes = ordenesSnap.docs.map((d) =>
        mapOrden(d.id, d.data() as Record<string, unknown>),
      );

      const resumen: ResumenRapido = {
        clientes: clientesSnap.data().count,
        vehiculos: vehiculosSnap.data().count,
        enProceso: ordenes.filter((o) => o.estado === "EN_PROCESO").length,
        listas: ordenes.filter((o) => o.estado === "LISTO").length,
        entregadas: ordenes.filter((o) => o.estado === "ENTREGADO").length,
        porCobrar: ordenes
          .filter((o) => o.saldoPendiente > 0)
          .reduce((a, o) => a + o.saldoPendiente, 0),
      };

      set({ resumen, loading: false });
      return resumen;
    } catch (err: any) {
      set({
        loading: false,
        error: err?.message || "Error al cargar resumen",
      });
      throw err;
    }
  },

  getDashboard: async (filtros) => {
    set({ loading: true, error: null });
    try {
      const [clientesSnap, vehiculosSnap, ordenesSnap] = await Promise.all([
        getCountFromServer(collection(db, "clientes")),
        getCountFromServer(collection(db, "vehiculos")),
        getDocs(collection(db, "ordenes")),
      ]);

      const todas = ordenesSnap.docs.map((d) =>
        mapOrden(d.id, d.data() as Record<string, unknown>),
      );
      const ordenes = filtrarOrdenes(todas, filtros);

      // Conteos
      const resumen = {
        clientes: clientesSnap.data().count,
        vehiculos: vehiculosSnap.data().count,
        ordenes: ordenes.length,
        enProceso: ordenes.filter((o) => o.estado === "EN_PROCESO").length,
        listas: ordenes.filter((o) => o.estado === "LISTO").length,
        entregadas: ordenes.filter((o) => o.estado === "ENTREGADO").length,
        canceladas: ordenes.filter((o) => o.estado === "CANCELADA").length,
        borrador: ordenes.filter((o) => o.estado === "BORRADOR").length,
      };

      // Finanzas
      const totalFacturado = ordenes.reduce((a, o) => a + o.total, 0);
      const totalCobrado = ordenes.reduce((a, o) => a + o.totalPagado, 0);
      const totalPorCobrar = ordenes.reduce((a, o) => a + o.saldoPendiente, 0);

      // Por estado
      const estadoMap = new Map<string, number>();
      for (const o of ordenes) {
        estadoMap.set(o.estado, (estadoMap.get(o.estado) || 0) + 1);
      }
      const porEstado = Array.from(estadoMap.entries()).map(
        ([estado, cantidad]) => ({ estado, cantidad }),
      );

      // Últimas 10
      const ultimasOrdenes = [...ordenes]
        .sort(
          (a, b) =>
            (b.fechaIngreso?.getTime() || 0) - (a.fechaIngreso?.getTime() || 0),
        )
        .slice(0, 10)
        .map((ot) => ({
          numero: ot.numero,
          fecha: ot.fechaIngreso,
          estado: ot.estado,
          total: ot.total,
          totalPagado: ot.totalPagado,
          saldoPendiente: ot.saldoPendiente,
          placa: ot.placa,
          vehiculo: `${ot.marca || ""} ${ot.modelo || ""}`.trim(),
          cliente: ot.clienteNombre || "",
        }));

      // Ventas por día
      const desdeVentas = filtros?.desde
        ? startOfDay(filtros.desde)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const hastaVentas = filtros?.hasta ? endOfDay(filtros.hasta) : new Date();

      const paraGrafico = ordenes.filter((o) => {
        if (o.estado === "CANCELADA") return false;
        if (!o.fechaIngreso) return false;
        return o.fechaIngreso >= desdeVentas && o.fechaIngreso <= hastaVentas;
      });

      const ventasMap = new Map<
        string,
        { facturado: number; cobrado: number; ordenes: number }
      >();

      for (const ot of paraGrafico) {
        const dia = ot.fechaIngreso!.toISOString().split("T")[0];
        const actual = ventasMap.get(dia) || {
          facturado: 0,
          cobrado: 0,
          ordenes: 0,
        };
        actual.facturado += ot.total;
        actual.cobrado += ot.totalPagado;
        actual.ordenes += 1;
        ventasMap.set(dia, actual);
      }

      const ventasPorDia = Array.from(ventasMap.entries())
        .map(([fecha, data]) => ({ fecha, ...data }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha));

      // Vehículos en taller (etapas activas)
      const vehiculosPorEtapa: Record<string, any[]> = {};
      let totalEtapasActivas = 0;

      for (const ot of ordenes) {
        if (["ENTREGADO", "CANCELADA"].includes(ot.estado)) continue;

        const etapasSnap = await getDocs(
          collection(db, "ordenes", ot.id, "etapas"),
        );

        for (const ed of etapasSnap.docs) {
          const e = ed.data();
          const estadoEtapa = e.estado as string;
          if (!["EN_PROCESO", "PAUSADO", "PENDIENTE"].includes(estadoEtapa)) {
            continue;
          }
          const nombre = (e.nombre as string) || "SIN NOMBRE";
          if (!vehiculosPorEtapa[nombre]) vehiculosPorEtapa[nombre] = [];
          vehiculosPorEtapa[nombre].push({
            etapaId: ed.id,
            estadoEtapa,
            responsable: e.responsable || null,
            ot: ot.numero,
            placa: ot.placa,
            vehiculo: `${ot.marca || ""} ${ot.modelo || ""}`.trim(),
            cliente: ot.clienteNombre || "",
          });
          totalEtapasActivas += 1;
        }
      }

      const resumenEtapas = Object.entries(vehiculosPorEtapa).map(
        ([etapa, vehiculos]) => ({
          etapa,
          cantidad: vehiculos.length,
          vehiculos,
        }),
      );

      const data: DashboardData = {
        resumen,
        finanzas: {
          totalFacturado,
          totalCobrado,
          totalPorCobrar,
          margenCobrado:
            totalFacturado > 0
              ? Math.round((totalCobrado / totalFacturado) * 100)
              : 0,
        },
        porEstado,
        vehiculosEnTaller: {
          total: totalEtapasActivas,
          porEtapa: resumenEtapas,
        },
        ventasPorDia,
        ultimasOrdenes,
      };

      set({ data, loading: false });
      return data;
    } catch (err: any) {
      set({
        loading: false,
        error: err?.message || "Error al cargar estadísticas",
      });
      throw err;
    }
  },
}));
