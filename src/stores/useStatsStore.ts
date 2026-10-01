// src/stores/useStatsStore.ts
import { create } from "zustand";
import { useClientesStore } from "./useClientesStore";
import { useVehiculosStore } from "./useVehiculosStore";
import { useOrdenesStore, type OrdenTrabajo } from "./useOrdenesStore";

export type StatsFiltros = {
  desde?: string;
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
    porEtapa: { etapa: string; cantidad: number; vehiculos: any[] }[];
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
  /** Calcula desde stores del bootstrap (sin red) */
  computeDashboard: (filtros?: StatsFiltros) => DashboardData;
  computeResumenRapido: () => ResumenRapido;
};

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

function filtrarOrdenes(ordenes: OrdenTrabajo[], filtros?: StatsFiltros) {
  if (!filtros) return ordenes;
  const desde = filtros.desde ? startOfDay(filtros.desde) : null;
  const hasta = filtros.hasta ? endOfDay(filtros.hasta) : null;
  const placaTerm = filtros.placa?.toUpperCase().trim();

  return ordenes.filter((ot) => {
    if (filtros.estado && ot.estado !== filtros.estado) return false;
    if (filtros.clienteId && ot.clienteId !== filtros.clienteId) return false;
    if (placaTerm && !ot.placa?.includes(placaTerm)) return false;
    const fi = ot.fechaIngreso
      ? ot.fechaIngreso instanceof Date
        ? ot.fechaIngreso
        : new Date(ot.fechaIngreso)
      : null;
    if (desde && fi && fi < desde) return false;
    if (hasta && fi && fi > hasta) return false;
    return true;
  });
}

function buildDashboard(
  clientes: number,
  vehiculos: number,
  ordenesIn: OrdenTrabajo[],
  filtros?: StatsFiltros,
): DashboardData {
  const ordenes = filtrarOrdenes(ordenesIn, filtros);

  const count = (estado: string) =>
    ordenes.filter((o) => o.estado === estado).length;

  const totalFacturado = ordenes.reduce((a, o) => a + (o.total || 0), 0);
  const totalCobrado = ordenes.reduce((a, o) => a + (o.totalPagado || 0), 0);
  const totalPorCobrar = ordenes.reduce(
    (a, o) => a + (o.saldoPendiente || 0),
    0,
  );

  const estadoMap = new Map<string, number>();
  for (const o of ordenes) {
    estadoMap.set(o.estado, (estadoMap.get(o.estado) || 0) + 1);
  }
  const porEstado = Array.from(estadoMap.entries()).map(
    ([estado, cantidad]) => ({ estado, cantidad }),
  );

  const ultimasOrdenes = [...ordenes]
    .sort((a, b) => {
      const da = a.fechaIngreso ? new Date(a.fechaIngreso).getTime() : 0;
      const db = b.fechaIngreso ? new Date(b.fechaIngreso).getTime() : 0;
      return db - da;
    })
    .slice(0, 10)
    .map((ot) => ({
      numero: ot.numero,
      fecha: ot.fechaIngreso
        ? ot.fechaIngreso instanceof Date
          ? ot.fechaIngreso
          : new Date(ot.fechaIngreso)
        : null,
      estado: ot.estado,
      total: ot.total,
      totalPagado: ot.totalPagado,
      saldoPendiente: ot.saldoPendiente,
      placa: ot.placa,
      vehiculo: `${ot.marca || ""} ${ot.modelo || ""}`.trim(),
      cliente: ot.clienteNombre || "",
    }));

  const desdeVentas = filtros?.desde
    ? startOfDay(filtros.desde)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const hastaVentas = filtros?.hasta ? endOfDay(filtros.hasta) : new Date();

  const ventasMap = new Map<
    string,
    { facturado: number; cobrado: number; ordenes: number }
  >();

  for (const ot of ordenes) {
    if (ot.estado === "CANCELADA" || !ot.fechaIngreso) continue;
    const fi =
      ot.fechaIngreso instanceof Date
        ? ot.fechaIngreso
        : new Date(ot.fechaIngreso);
    if (fi < desdeVentas || fi > hastaVentas) continue;
    const dia = fi.toISOString().split("T")[0];
    const actual = ventasMap.get(dia) || {
      facturado: 0,
      cobrado: 0,
      ordenes: 0,
    };
    actual.facturado += ot.total || 0;
    actual.cobrado += ot.totalPagado || 0;
    actual.ordenes += 1;
    ventasMap.set(dia, actual);
  }

  const ventasPorDia = Array.from(ventasMap.entries())
    .map(([fecha, d]) => ({ fecha, ...d }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  // Taller sin subconsultas: agrupar OTs activas por estado
  const activas = ordenes.filter(
    (o) => !["ENTREGADO", "CANCELADA", "BORRADOR"].includes(o.estado),
  );
  const porEtapaMap: Record<string, any[]> = {};
  for (const ot of activas) {
    const nombre = ot.estado;
    if (!porEtapaMap[nombre]) porEtapaMap[nombre] = [];
    porEtapaMap[nombre].push({
      ot: ot.numero,
      placa: ot.placa,
      vehiculo: `${ot.marca || ""} ${ot.modelo || ""}`.trim(),
      cliente: ot.clienteNombre || "",
    });
  }
  const porEtapa = Object.entries(porEtapaMap).map(([etapa, vehiculos]) => ({
    etapa,
    cantidad: vehiculos.length,
    vehiculos,
  }));

  return {
    resumen: {
      clientes,
      vehiculos,
      ordenes: ordenes.length,
      enProceso: count("EN_PROCESO"),
      listas: count("LISTO"),
      entregadas: count("ENTREGADO"),
      canceladas: count("CANCELADA"),
      borrador: count("BORRADOR"),
    },
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
      total: activas.length,
      porEtapa,
    },
    ventasPorDia,
    ultimasOrdenes,
  };
}

export const useStatsStore = create<StatsState>((set) => ({
  data: null,
  resumen: null,

  computeDashboard: (filtros) => {
    const clientes = useClientesStore.getState().clientes.length;
    const vehiculos = useVehiculosStore.getState().vehiculos.length;
    const ordenes = useOrdenesStore.getState().ordenes;
    const data = buildDashboard(clientes, vehiculos, ordenes, filtros);
    set({ data });
    return data;
  },

  computeResumenRapido: () => {
    const clientes = useClientesStore.getState().clientes.length;
    const vehiculos = useVehiculosStore.getState().vehiculos.length;
    const ordenes = useOrdenesStore.getState().ordenes;
    const resumen: ResumenRapido = {
      clientes,
      vehiculos,
      enProceso: ordenes.filter((o) => o.estado === "EN_PROCESO").length,
      listas: ordenes.filter((o) => o.estado === "LISTO").length,
      entregadas: ordenes.filter((o) => o.estado === "ENTREGADO").length,
      porCobrar: ordenes
        .filter((o) => o.saldoPendiente > 0)
        .reduce((a, o) => a + o.saldoPendiente, 0),
    };
    set({ resumen });
    return resumen;
  },
}));
