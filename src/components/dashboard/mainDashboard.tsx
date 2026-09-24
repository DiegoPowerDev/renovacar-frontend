"use client";

import { useEffect, useState } from "react";
import { statsApi } from "@/lib/api"; // ajusta la ruta
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Car,
  Wrench,
  CheckCircle2,
  PackageCheck,
  Banknote,
  AlertCircle,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { formatDate } from "date-fns";
import { StatsFiltros } from "@/types/types";

// ======================
// TIPOS
// ======================
type DashboardData = {
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
    fecha: string;
    estado: string;
    total: number;
    totalPagado: number;
    saldoPendiente: number;
    placa: string;
    vehiculo: string;
    cliente: string;
  }[];
};

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
    minimumFractionDigits: 0,
  }).format(n);

// ======================
// CARD KPI
// ======================
function KpiCard({
  title,
  value,
  icon: Icon,
  subtitle,
  accent = "emerald",
}: {
  title: string;
  value: string | number;
  icon: any;
  subtitle?: string;
  accent?: "emerald" | "amber" | "sky" | "rose" | "violet";
}) {
  const accents = {
    emerald: "bg-emerald-500/15 text-emerald-400",
    amber: "bg-amber-500/15 text-amber-400",
    sky: "bg-sky-500/15 text-sky-400",
    rose: "bg-rose-500/15 text-rose-400",
    violet: "bg-violet-500/15 text-violet-400",
  };

  return (
    <Card className="">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-white/50">{title}</p>
            <p className="text-2xl font-semibold text-white mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-white/40 mt-1">{subtitle}</p>
            )}
          </div>
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-xl ${accents[accent]}`}
          >
            <Icon size={18} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ======================
// DASHBOARD
// ======================
export default function MainDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filtros, setFiltros] = useState<StatsFiltros>({
    desde: "",
    hasta: "",
    estado: "",
    placa: "",
  });

  const loadData = async (f?: StatsFiltros) => {
    try {
      setLoading(true);
      setError("");

      // limpiar filtros vacíos
      const params: StatsFiltros = {};
      if (f?.desde) params.desde = f.desde;
      if (f?.hasta) params.hasta = f.hasta;
      if (f?.estado) params.estado = f.estado;
      if (f?.placa) params.placa = f.placa;

      const res = await statsApi.getAll(params);
      setData(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Error al cargar estadísticas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const aplicarFiltros = () => loadData(filtros);
  const limpiarFiltros = () => {
    const vacios = { desde: "", hasta: "", estado: "", placa: "" };
    setFiltros(vacios);
    loadData(vacios);
  };

  const pieData =
    data?.porEstado.map((e) => ({
      name: e.estado,
      value: e.cantidad,
      color: COLORES_ESTADO[e.estado] || "#94a3b8",
    })) || [];

  return (
    <div className="flex-1 w-full h-screen flex flex-col p-6 gap-4">
      {/* Header */}
      <div className="flex h-16 flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-white">Dashboard</h1>
          <p className="text-sm text-white/50">
            Resumen operativo de Renova Car Service
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => loadData(filtros)}
          className="border-white/10 text-black hover:bg-white/60 w-fit"
        >
          <RefreshCw size={14} className="mr-2" />
          Actualizar
        </Button>
      </div>
      {/* Filtros */}
      <Card className="flex h-24 bg-white/10 p-4 shrink-0">
        <CardContent className="text-white grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-xs text-white/40 mb-1 block">Desde</label>
            <Input
              type="date"
              value={filtros.desde}
              onChange={(e) =>
                setFiltros((f) => ({ ...f, desde: e.target.value }))
              }
              className="bg-white/5 text-white! border-white/10 "
            />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Hasta</label>
            <Input
              type="date"
              value={filtros.hasta}
              onChange={(e) =>
                setFiltros((f) => ({ ...f, hasta: e.target.value }))
              }
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Estado</label>
            <Select
              value={filtros.estado || "TODOS"}
              onValueChange={(v) =>
                setFiltros((f: any) => ({
                  ...f,
                  estado: v === "TODOS" ? "" : v,
                }))
              }
            >
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent side="top">
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="BORRADOR">Borrador</SelectItem>
                <SelectItem value="EN_PROCESO">En proceso</SelectItem>
                <SelectItem value="LISTO">Listo</SelectItem>
                <SelectItem value="ENTREGADO">Entregado</SelectItem>
                <SelectItem value="CANCELADA">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Placa</label>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
              />
              <Input
                placeholder="ABC-123"
                value={filtros.placa}
                onChange={(e) =>
                  setFiltros((f) => ({ ...f, placa: e.target.value }))
                }
                className="pl-9 bg-white/5 border-white/10"
              />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <Button
              onClick={aplicarFiltros}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500"
            >
              Filtrar
            </Button>
            <Button
              variant="outline"
              onClick={limpiarFiltros}
              className="border-white/10 text-black"
            >
              Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>
      {/* Loading / Error */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-sm text-white/50">Cargando dashboard...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      ) : data ? (
        <div className="flex-1 w-full overflow-y-auto px-12 py-4 flex flex-col gap-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <KpiCard
              title="Clientes"
              value={data.resumen.clientes}
              icon={Users}
              accent="sky"
            />
            <KpiCard
              title="Vehículos"
              value={data.resumen.vehiculos}
              icon={Car}
              accent="violet"
            />
            <KpiCard
              title="En proceso"
              value={data.resumen.enProceso}
              icon={Wrench}
              accent="amber"
            />
            <KpiCard
              title="Listos"
              value={data.resumen.listas}
              icon={PackageCheck}
              accent="emerald"
            />
            <KpiCard
              title="Entregados"
              value={data.resumen.entregadas}
              icon={CheckCircle2}
              accent="emerald"
            />
            <KpiCard
              title="Por cobrar"
              value={formatoSoles(data.finanzas.totalPorCobrar)}
              icon={AlertCircle}
              accent="rose"
              subtitle={`${data.finanzas.margenCobrado}% cobrado`}
            />
          </div>
          {/* Finanzas + Estados */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Finanzas */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-white">Finanzas</CardTitle>
                <CardDescription>Resumen del período</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/50">Facturado</span>
                  <span className="font-semibold text-white">
                    {formatoSoles(data.finanzas.totalFacturado)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/50">Cobrado</span>
                  <span className="font-semibold text-emerald-400">
                    {formatoSoles(data.finanzas.totalCobrado)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/50">Por cobrar</span>
                  <span className="font-semibold text-rose-400">
                    {formatoSoles(data.finanzas.totalPorCobrar)}
                  </span>
                </div>
                <div className="pt-2 border-t border-white/10">
                  <div className="flex justify-between text-xs text-white/40 mb-1">
                    <span>Progreso de cobro</span>
                    <span>{data.finanzas.margenCobrado}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${data.finanzas.margenCobrado}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gráfico por estado */}
            <Card className=" lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-white">
                  Órdenes por estado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  {pieData.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-white/40 text-sm">
                      Sin datos
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={pieData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#ffffff10"
                        />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: "#ffffff60", fontSize: 11 }}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{ fill: "#ffffff60", fontSize: 11 }}
                          axisLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "#1a1a1a",
                            border: "1px solid #333",
                            borderRadius: 8,
                          }}
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                          {pieData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Ventas por día + Taller */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-white">
                  Facturación por día
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  {data.ventasPorDia.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-white/40 text-sm">
                      Sin datos en el período
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.ventasPorDia}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#ffffff10"
                        />
                        <XAxis
                          dataKey="fecha"
                          tick={{ fill: "#ffffff60", fontSize: 10 }}
                          tickFormatter={(v) =>
                            formatDate(new Date(v), "dd/MM")
                          }
                          axisLine={false}
                        />
                        <YAxis
                          tick={{ fill: "#ffffff60", fontSize: 11 }}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "#1a1a1a",
                            border: "1px solid #333",
                            borderRadius: 8,
                          }}
                          formatter={(value: any) => formatoSoles(value)}
                          labelFormatter={(l: any) =>
                            formatDate(new Date(l), "dd MMM yyyy")
                          }
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="facturado"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={false}
                          name="Facturado"
                        />
                        <Line
                          type="monotone"
                          dataKey="cobrado"
                          stroke="#38bdf8"
                          strokeWidth={2}
                          dot={false}
                          name="Cobrado"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Vehículos en taller */}
            <Card className="">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-white">
                  En taller
                </CardTitle>
                <CardDescription>
                  {data.vehiculosEnTaller.total} vehículo(s) activos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {data.vehiculosEnTaller.porEtapa.length === 0 ? (
                    <p className="text-sm text-white/40">Nada en producción</p>
                  ) : (
                    data.vehiculosEnTaller.porEtapa.map((e) => (
                      <div
                        key={e.etapa}
                        className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                      >
                        <span className="text-sm text-white/70">{e.etapa}</span>
                        <span className="text-sm font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                          {e.cantidad}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Últimas órdenes */}
          <Card className="">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white">
                Últimas órdenes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-white/40 border-b border-white/10">
                      <th className="pb-3 font-medium">OT</th>
                      <th className="pb-3 font-medium">Placa</th>
                      <th className="pb-3 font-medium">Cliente</th>
                      <th className="pb-3 font-medium">Estado</th>
                      <th className="pb-3 font-medium text-right">Total</th>
                      <th className="pb-3 font-medium text-right">Saldo</th>
                      <th className="pb-3 font-medium">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.ultimasOrdenes.map((ot) => (
                      <tr
                        key={ot.numero}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="py-3 font-medium text-emerald-400">
                          {ot.numero}
                        </td>
                        <td className="py-3 text-white">{ot.placa}</td>
                        <td className="py-3 text-white/70">{ot.cliente}</td>
                        <td className="py-3">
                          <span
                            className="text-xs px-2 py-1 rounded-md"
                            style={{
                              backgroundColor: `${COLORES_ESTADO[ot.estado] || "#94a3b8"}20`,
                              color: COLORES_ESTADO[ot.estado] || "#94a3b8",
                            }}
                          >
                            {ot.estado}
                          </span>
                        </td>
                        <td className="py-3 text-right text-white">
                          {formatoSoles(ot.total)}
                        </td>
                        <td className="py-3 text-right">
                          <span
                            className={
                              ot.saldoPendiente > 0
                                ? "text-rose-400"
                                : "text-white/40"
                            }
                          >
                            {formatoSoles(ot.saldoPendiente)}
                          </span>
                        </td>
                        <td className="py-3 text-white/50">
                          {formatDate(new Date(ot.fecha), "dd/MM/yyyy")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
