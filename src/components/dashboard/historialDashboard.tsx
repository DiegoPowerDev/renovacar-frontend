// components/dashboard/HistorialDashboard.tsx
"use client";

import { useMemo, useState } from "react";
import { useVehiculosStore } from "@/stores/useVehiculosStore";
import { useOrdenesStore, type OrdenTrabajo } from "@/stores/useOrdenesStore";
import { useClientesStore } from "@/stores/useClientesStore";
import { Input } from "../ui/input";
import {
  Search,
  History,
  Car,
  User,
  ClipboardList,
  Banknote,
} from "lucide-react";
import { formatDate } from "date-fns";

const COLORES_ESTADO: Record<string, string> = {
  BORRADOR: "#94a3b8",
  COTIZADA: "#38bdf8",
  EN_PROCESO: "#f59e0b",
  CONTROL_CALIDAD: "#a78bfa",
  LISTO: "#34d399",
  ENTREGADO: "#10b981",
  CANCELADA: "#f87171",
};

const formatoSoles = (n: number) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(n ?? 0);

function fmtDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return formatDate(d, "dd/MM/yyyy");
}

export default function HistorialDashboard() {
  const { vehiculos } = useVehiculosStore();
  const { ordenes } = useOrdenesStore();
  const { clientes } = useClientesStore();

  const [busqueda, setBusqueda] = useState("");
  const [placaActiva, setPlacaActiva] = useState<string | null>(null);

  const sugerencias = useMemo(() => {
    if (!busqueda.trim()) return vehiculos.slice(0, 8);
    const t = busqueda.toUpperCase().trim();
    return vehiculos
      .filter(
        (v) =>
          v.placa.includes(t) ||
          v.clienteNombre?.toUpperCase().includes(t) ||
          v.marca?.toUpperCase().includes(t) ||
          v.modelo?.toUpperCase().includes(t),
      )
      .slice(0, 10);
  }, [vehiculos, busqueda]);

  const vehiculo = useMemo(() => {
    if (!placaActiva) return null;
    return vehiculos.find((v) => v.placa === placaActiva) || null;
  }, [vehiculos, placaActiva]);

  const cliente = useMemo(() => {
    if (!vehiculo) return null;
    return (
      clientes.find((c) => c.id === vehiculo.clienteId) ||
      (vehiculo.cliente as any) ||
      null
    );
  }, [clientes, vehiculo]);

  const historial: OrdenTrabajo[] = useMemo(() => {
    if (!placaActiva) return [];
    return ordenes
      .filter((o) => o.placa === placaActiva)
      .sort((a, b) => {
        const da = a.fechaIngreso ? new Date(a.fechaIngreso).getTime() : 0;
        const db = b.fechaIngreso ? new Date(b.fechaIngreso).getTime() : 0;
        return db - da;
      });
  }, [ordenes, placaActiva]);

  const resumen = useMemo(() => {
    const totalOrdenes = historial.length;
    const entregadas = historial.filter((o) => o.estado === "ENTREGADO").length;
    const enProceso = historial.filter((o) =>
      ["EN_PROCESO", "CONTROL_CALIDAD", "LISTO", "COTIZADA"].includes(o.estado),
    ).length;
    const totalFacturado = historial.reduce((a, o) => a + (o.total || 0), 0);
    const totalCobrado = historial.reduce(
      (a, o) => a + (o.totalPagado || 0),
      0,
    );
    return {
      totalOrdenes,
      entregadas,
      enProceso,
      totalFacturado,
      totalCobrado,
      saldo: totalFacturado - totalCobrado,
    };
  }, [historial]);

  const seleccionar = (placa: string) => {
    setPlacaActiva(placa);
    setBusqueda(placa);
  };

  return (
    <div className="flex-1 w-full flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400">
            <History size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">
              Historial por placa
            </h1>
            <p className="text-sm text-white/50">
              Consulta el historial completo de un vehículo
            </p>
          </div>
        </div>
      </div>

      {/* Buscador */}
      <div className="max-w-xl space-y-2">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
          />
          <Input
            className="pl-9 bg-white/5 border-white/10 placeholder:text-white/30"
            placeholder="Buscar placa, dueño o marca..."
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value.toUpperCase());
              setPlacaActiva(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && sugerencias[0]) {
                seleccionar(sugerencias[0].placa);
              }
            }}
          />
        </div>

        {!placaActiva && (
          <div className="rounded-xl border border-white/10 divide-y divide-white/5 overflow-hidden">
            {sugerencias.length === 0 ? (
              <p className="text-sm text-white/40 p-4 text-center">
                No hay vehículos que coincidan
              </p>
            ) : (
              sugerencias.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => seleccionar(v.placa)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
                >
                  <Car size={16} className="text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-emerald-400 tracking-wide text-sm">
                      {v.placa}
                    </p>
                    <p className="text-xs text-white/50 truncate">
                      {v.marca} {v.modelo}
                      {v.clienteNombre ? ` · ${v.clienteNombre}` : ""}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Resultado */}
      {placaActiva && vehiculo && (
        <div className="flex flex-col gap-6">
          {/* Ficha vehículo + dueño */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <Car size={18} />
                <span className="font-semibold tracking-wide">
                  {vehiculo.placa}
                </span>
              </div>
              <p className="text-white">
                {vehiculo.marca} {vehiculo.modelo}
                {vehiculo.anio ? ` · ${vehiculo.anio}` : ""}
              </p>
              <p className="text-sm text-white/50">
                Color: {vehiculo.color || "—"}
                {vehiculo.vin ? ` · VIN: ${vehiculo.vin}` : ""}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <User size={18} />
                <span className="font-semibold">Dueño</span>
              </div>
              <p className="text-white">
                {cliente?.nombre || vehiculo.clienteNombre || "—"}
              </p>
              <p className="text-sm text-white/50">
                {[cliente?.dniRuc, cliente?.whatsapp || cliente?.telefono]
                  .filter(Boolean)
                  .join(" · ") || "Sin datos de contacto"}
              </p>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              {
                label: "Órdenes",
                value: String(resumen.totalOrdenes),
                icon: ClipboardList,
              },
              {
                label: "En proceso",
                value: String(resumen.enProceso),
                icon: ClipboardList,
              },
              {
                label: "Entregadas",
                value: String(resumen.entregadas),
                icon: ClipboardList,
              },
              {
                label: "Facturado",
                value: formatoSoles(resumen.totalFacturado),
                icon: Banknote,
              },
              {
                label: "Cobrado",
                value: formatoSoles(resumen.totalCobrado),
                icon: Banknote,
              },
              {
                label: "Saldo",
                value: formatoSoles(resumen.saldo),
                icon: Banknote,
                alert: resumen.saldo > 0,
              },
            ].map((k) => (
              <div
                key={k.label}
                className="rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <p className="text-[10px] text-white/40 uppercase tracking-wide">
                  {k.label}
                </p>
                <p
                  className={`text-sm font-semibold mt-1 ${
                    k.alert ? "text-rose-400" : "text-white"
                  }`}
                >
                  {k.value}
                </p>
              </div>
            ))}
          </div>

          {/* Lista OT */}
          <div>
            <h2 className="text-sm font-medium text-white/70 mb-3">
              Historial de órdenes
            </h2>
            {historial.length === 0 ? (
              <p className="text-sm text-white/40 py-8 text-center border border-dashed border-white/10 rounded-xl">
                Este vehículo aún no tiene órdenes de trabajo
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs text-white/40">
                      <th className="px-4 py-3 font-medium">OT</th>
                      <th className="px-4 py-3 font-medium">Fecha</th>
                      <th className="px-4 py-3 font-medium">Estado</th>
                      <th className="px-4 py-3 font-medium text-right">
                        Total
                      </th>
                      <th className="px-4 py-3 font-medium text-right">
                        Pagado
                      </th>
                      <th className="px-4 py-3 font-medium text-right">
                        Saldo
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map((ot) => {
                      const color = COLORES_ESTADO[ot.estado] || "#94a3b8";
                      return (
                        <tr
                          key={ot.id}
                          className="border-b border-white/5 hover:bg-white/5"
                        >
                          <td className="px-4 py-3 font-medium text-emerald-400">
                            {ot.numero}
                          </td>
                          <td className="px-4 py-3 text-white/70">
                            {fmtDate(ot.fechaIngreso)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-md font-medium"
                              style={{
                                backgroundColor: `${color}22`,
                                color,
                              }}
                            >
                              {ot.estado}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-white">
                            {formatoSoles(ot.total)}
                          </td>
                          <td className="px-4 py-3 text-right text-emerald-400/90">
                            {formatoSoles(ot.totalPagado)}
                          </td>
                          <td
                            className={`px-4 py-3 text-right ${
                              ot.saldoPendiente > 0
                                ? "text-rose-400"
                                : "text-white/40"
                            }`}
                          >
                            {formatoSoles(ot.saldoPendiente)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {placaActiva && !vehiculo && (
        <p className="text-sm text-rose-400">
          No se encontró el vehículo {placaActiva}
        </p>
      )}
    </div>
  );
}
