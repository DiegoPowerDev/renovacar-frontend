"use client";

import { useEffect } from "react";
import { useCatalogoStore } from "@/stores/useCatalogoStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  type ResumenPagos,
  type MetodoPago,
  type ItemCotizacion,
  type OrdenTrabajo,
  type EstadoOT,
  type CrearOrdenInput,
  type CotizacionResumen,
  type ResumenEtapasOT,
  type EtapaProduccion,
  type EstadoFinalOT,
  useOrdenesStore,
} from "@/stores/useOrdenesStore";

import { useMemo, useState } from "react";
import { useVehiculosStore } from "@/stores/useVehiculosStore";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Search,
  ClipboardList,
  Car,
  User,
  Banknote,
  Calendar,
  Plus,
  X,
  Trash2,
} from "lucide-react";
import { formatDate } from "date-fns";
import { useAuthStore } from "@/stores/useAuthStore";

const ESTADOS: EstadoOT[] = [
  "BORRADOR",
  "COTIZADA",
  "EN_PROCESO",
  "CONTROL_CALIDAD",
  "LISTO",
  "ENTREGADO",
  "CANCELADA",
];

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

function fmtDate(
  value: Date | string | null | undefined,
  pattern = "dd MMM yyyy",
) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return formatDate(d, pattern);
}

// ======================
// CARD
// ======================
function OrdenCard({
  data,
  onClick,
}: {
  data: OrdenTrabajo;
  onClick: (ot: OrdenTrabajo) => void;
}) {
  const color = COLORES_ESTADO[data.estado] || "#94a3b8";

  return (
    <button
      type="button"
      onClick={() => onClick(data)}
      className="group relative flex flex-col gap-4 p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-emerald-500/40 transition-all duration-200 text-left w-full"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-emerald-400 tracking-wide text-sm">
            {data.numero}
          </p>
          <div className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30">
            <span className="font-bold text-emerald-400 tracking-wider text-xs">
              {data.placa}
            </span>
          </div>
        </div>
        <span
          className="text-[10px] px-2 py-1 rounded-md shrink-0 font-medium"
          style={{
            backgroundColor: `${color}22`,
            color,
          }}
        >
          {data.estado}
        </span>
      </div>

      <div className="flex flex-col gap-2 text-sm text-white/70">
        <div className="flex items-center gap-2">
          <User size={14} className="text-white/40 shrink-0" />
          <span className="truncate">
            {data.clienteNombre || "Sin cliente"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Car size={14} className="text-white/40 shrink-0" />
          <span className="truncate">
            {[data.marca, data.modelo].filter(Boolean).join(" ") || "—"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-white/40 shrink-0" />
          <span>{fmtDate(data.fechaIngreso)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-white/10 text-sm">
        <div className="flex items-center gap-1.5 text-white/50">
          <Banknote size={14} />
          <span className="text-xs">Total</span>
        </div>
        <div className="text-right">
          <p className="font-semibold text-white">{formatoSoles(data.total)}</p>
          {data.saldoPendiente > 0 ? (
            <p className="text-[11px] text-rose-400">
              Saldo {formatoSoles(data.saldoPendiente)}
            </p>
          ) : (
            <p className="text-[11px] text-emerald-400/80">Pagado</p>
          )}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-200 rounded-b-2xl" />
    </button>
  );
}

// ======================
// DASHBOARD
// ======================
export default function OrdenesDashboard() {
  const {
    ordenes,
    crearDesdePlaca,
    cambiarEstado,
    obtenerCotizacion,
    agregarItem,
    eliminarItem,
    registrarPago,
    generarEtapas,
    obtenerEtapas,
    iniciarEtapa,
    pausarEtapa,
    terminarEtapa,
    asignarResponsable,
    eliminarPago,
    obtenerResumenPagos,
    registrarControlCalidad,
    registrarEntrega,
    obtenerEstadoFinal,
  } = useOrdenesStore();
  const { vehiculos } = useVehiculosStore();
  const { servicios } = useCatalogoStore();
  const can = useAuthStore((s) => s.can);

  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");
  const [saving, setSaving] = useState(false);

  //PAGOS
  const [resumenPagos, setResumenPagos] = useState<ResumenPagos | null>(null);
  const [loadingPagos, setLoadingPagos] = useState(false);

  const [pagoMonto, setPagoMonto] = useState("");
  const [pagoMetodo, setPagoMetodo] = useState<string>("YAPE");
  const [pagoComprobante, setPagoComprobante] = useState("");
  const [pagoObs, setPagoObs] = useState("");
  const [pagoError, setPagoError] = useState("");
  //ETAPAS
  const [resumenEtapas, setResumenEtapas] = useState<ResumenEtapasOT | null>(
    null,
  );
  const [loadingEtapas, setLoadingEtapas] = useState(false);
  const [tipoPlantilla, setTipoPlantilla] = useState("PINTURA");
  const [responsableDraft, setResponsableDraft] = useState<
    Record<string, string>
  >({});
  const [prodError, setProdError] = useState("");

  const PLANTILLAS_UI = [
    { value: "PINTURA", label: "Pintura" },
    { value: "DETAILING", label: "Detailing" },
    { value: "GENERAL", label: "General" },
  ];

  const COLOR_ETAPA: Record<string, string> = {
    PENDIENTE: "#94a3b8",
    EN_PROCESO: "#f59e0b",
    PAUSADO: "#a78bfa",
    TERMINADO: "#10b981",
  };

  const METODOS = [
    "EFECTIVO",
    "YAPE",
    "PLIN",
    "TRANSFERENCIA",
    "TARJETA",
    "OTRO",
  ];

  // Detalle
  const [openDetail, setOpenDetail] = useState(false);
  const [seleccionada, setSeleccionada] = useState<OrdenTrabajo | null>(null);
  const [estadoEdit, setEstadoEdit] = useState<EstadoOT>("BORRADOR");
  const [detailError, setDetailError] = useState("");

  // Crear
  const [openCreate, setOpenCreate] = useState(false);
  const [placaCreate, setPlacaCreate] = useState("");
  const [busquedaPlaca, setBusquedaPlaca] = useState("");
  const [obsCreate, setObsCreate] = useState("");
  const [kmCreate, setKmCreate] = useState("");
  const [createError, setCreateError] = useState("");

  // Form nuevo ítem
  const [tab, setTab] = useState("resumen");
  const [cotizacion, setCotizacion] = useState<CotizacionResumen | null>(null);
  const [loadingCot, setLoadingCot] = useState(false);
  const [itemNombre, setItemNombre] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemCant, setItemCant] = useState("1");
  const [itemPrecio, setItemPrecio] = useState("");
  const [itemDescmto, setItemDescmto] = useState("0");
  const [itemCatalogoId, setItemCatalogoId] = useState("");
  const [itemError, setItemError] = useState("");

  //ESTADO
  const [estadoFinal, setEstadoFinal] = useState<EstadoFinalOT | null>(null);
  const [loadingFinal, setLoadingFinal] = useState(false);

  // QC
  const [qcAprobado, setQcAprobado] = useState(true);
  const [qcObs, setQcObs] = useState("");
  const [qcInspector, setQcInspector] = useState("");
  const [qcError, setQcError] = useState("");

  // Entrega
  const [entRecibidoPor, setEntRecibidoPor] = useState("");
  const [entEntregadoPor, setEntEntregadoPor] = useState("");
  const [entKm, setEntKm] = useState("");
  const [entObs, setEntObs] = useState("");
  const [entConformidad, setEntConformidad] = useState(true);
  const [entError, setEntError] = useState("");

  const cargarCotizacion = async (numeroOT: string) => {
    try {
      setLoadingCot(true);
      const cot = await obtenerCotizacion(numeroOT);
      setCotizacion(cot);
    } catch (err: any) {
      setDetailError(err?.message || "Error al cargar cotización");
    } finally {
      setLoadingCot(false);
    }
  };

  const cargarPagos = async (numeroOT: string) => {
    try {
      setLoadingPagos(true);
      const r = await obtenerResumenPagos(numeroOT);
      setResumenPagos(r);
    } catch (err: any) {
      setDetailError(err?.message || "Error al cargar pagos");
    } finally {
      setLoadingPagos(false);
    }
  };

  const cargarEtapas = async (numeroOT: string) => {
    try {
      setLoadingEtapas(true);
      setProdError("");
      const r = await obtenerEtapas(numeroOT);
      setResumenEtapas(r);
    } catch (err: any) {
      // si no hay etapas aún, no es error grave
      setResumenEtapas(null);
      if (!err?.message?.includes("no encontrada")) {
        setProdError(err?.message || "Error al cargar etapas");
      }
    } finally {
      setLoadingEtapas(false);
    }
  };

  const abrirDetalle = (ot: OrdenTrabajo) => {
    setSeleccionada(ot);
    setEstadoEdit(ot.estado);
    setDetailError("");
    setTab("resumen");
    setCotizacion(null);
    setResumenPagos(null);
    setResumenEtapas(null);
    setProdError("");
    resetPagoForm();
    setOpenDetail(true);
    cargarCotizacion(ot.numero);
    cargarPagos(ot.numero);
    cargarEtapas(ot.numero);
    cargarEstadoFinal(ot.numero);
  };

  const resetPagoForm = () => {
    setPagoMonto("");
    setPagoMetodo("YAPE");
    setPagoComprobante("");
    setPagoObs("");
    setPagoError("");
  };
  const dataFiltrada = useMemo(() => {
    let list = ordenes;
    if (filtroEstado !== "TODOS") {
      list = list.filter((o) => o.estado === filtroEstado);
    }
    if (!search.trim()) return list;
    const term = search.toLowerCase().trim();
    return list.filter(
      (o) =>
        o.numero?.toLowerCase().includes(term) ||
        o.placa?.toLowerCase().includes(term) ||
        o.clienteNombre?.toLowerCase().includes(term) ||
        o.marca?.toLowerCase().includes(term) ||
        o.modelo?.toLowerCase().includes(term) ||
        o.estado?.toLowerCase().includes(term),
    );
  }, [ordenes, search, filtroEstado]);

  const placasFiltradas = useMemo(() => {
    if (!busquedaPlaca.trim()) return vehiculos.slice(0, 10);
    const term = busquedaPlaca.toUpperCase().trim();
    return vehiculos
      .filter(
        (v) =>
          v.placa.includes(term) ||
          v.clienteNombre?.toUpperCase().includes(term) ||
          v.marca?.toUpperCase().includes(term),
      )
      .slice(0, 10);
  }, [vehiculos, busquedaPlaca]);

  const guardarEstado = async () => {
    if (!seleccionada) return;
    if (estadoEdit === seleccionada.estado) {
      setOpenDetail(false);
      return;
    }
    try {
      setSaving(true);
      setDetailError("");
      const actualizada = await cambiarEstado(seleccionada.numero, estadoEdit);
      setSeleccionada(actualizada);
    } catch (err: any) {
      setDetailError(err?.message || "No se pudo cambiar el estado");
    } finally {
      setSaving(false);
    }
  };

  const abrirCrear = () => {
    setPlacaCreate("");
    setBusquedaPlaca("");
    setObsCreate("");
    setKmCreate("");
    setCreateError("");
    setOpenCreate(true);
  };

  const guardarNueva = async () => {
    if (!placaCreate.trim()) {
      setCreateError("Selecciona o escribe una placa");
      return;
    }
    try {
      setSaving(true);
      setCreateError("");
      const input: CrearOrdenInput = {
        placa: placaCreate.trim().toUpperCase(),
        observaciones: obsCreate.trim() || undefined,
        kilometraje: kmCreate ? Number(kmCreate) : undefined,
      };
      const ot = await crearDesdePlaca(input);
      setOpenCreate(false);
      abrirDetalle(ot);
    } catch (err: any) {
      setCreateError(err?.message || "Error al crear la orden");
    } finally {
      setSaving(false);
    }
  };
  const resetItemForm = () => {
    setItemNombre("");
    setItemDesc("");
    setItemCant("1");
    setItemPrecio("");
    setItemDescmto("0");
    setItemCatalogoId("");
    setItemError("");
  };

  const onPickCatalogo = (value: any) => {
    const catalogoID = value.id;
    setItemCatalogoId(value.nombre);
    const s = servicios.find((x) => x.id === catalogoID);
    if (s) {
      setItemNombre(s.nombre);
      setItemDesc(s.descripcion || "");
      setItemPrecio(String(s.precioBase ?? 0));
    }
  };

  const guardarItem = async () => {
    if (!seleccionada) return;
    if (!itemNombre.trim()) {
      setItemError("Nombre obligatorio");
      return;
    }
    const precio = Number(itemPrecio);
    const cantidad = Number(itemCant) || 1;
    const descuento = Number(itemDescmto) || 0;
    if (isNaN(precio) || precio < 0) {
      setItemError("Precio inválido");
      return;
    }

    try {
      setSaving(true);
      setItemError("");
      const cot = await agregarItem({
        numeroOT: seleccionada.numero,
        nombre: itemNombre.trim(),
        descripcion: itemDesc.trim() || undefined,
        cantidad,
        precioUnitario: precio,
        descuento,
        servicioCatalogoId: itemCatalogoId || undefined,
      });
      setCotizacion(cot);
      resetItemForm();
    } catch (err: any) {
      setItemError(err?.message || "No se pudo agregar el ítem");
    } finally {
      setSaving(false);
    }
  };

  const borrarItem = async (itemId: string) => {
    if (!seleccionada) return;
    try {
      setSaving(true);
      const cot = await eliminarItem(seleccionada.numero, itemId);
      setCotizacion(cot);
    } catch (err: any) {
      setItemError(err?.message || "No se pudo eliminar");
    } finally {
      setSaving(false);
    }
  };

  const guardarPago = async () => {
    if (!seleccionada) return;
    const monto = Number(pagoMonto);
    if (isNaN(monto) || monto <= 0) {
      setPagoError("El monto debe ser mayor a 0");
      return;
    }

    try {
      setSaving(true);
      setPagoError("");
      const r = await registrarPago({
        numeroOT: seleccionada.numero,
        monto,
        metodo: pagoMetodo,
        comprobante: pagoComprobante.trim() || undefined,
        observaciones: pagoObs.trim() || undefined,
      });
      setResumenPagos(r);
      resetPagoForm();
      // opcional: refrescar cotización por si lees totales de ahí
      await cargarCotizacion(seleccionada.numero);
    } catch (err: any) {
      setPagoError(err?.message || "No se pudo registrar el pago");
    } finally {
      setSaving(false);
    }
  };

  const borrarPago = async (pagoId: string) => {
    if (!seleccionada) return;
    try {
      setSaving(true);
      const r = await eliminarPago(seleccionada.numero, pagoId);
      setResumenPagos(r);
      await cargarCotizacion(seleccionada.numero);
    } catch (err: any) {
      setPagoError(err?.message || "No se pudo eliminar el pago");
    } finally {
      setSaving(false);
    }
  };

  const onGenerarEtapas = async () => {
    if (!seleccionada) return;
    try {
      setSaving(true);
      setProdError("");
      const r = await generarEtapas(seleccionada.numero, tipoPlantilla);
      setResumenEtapas(r);
    } catch (err: any) {
      setProdError(err?.message || "No se pudieron generar las etapas");
    } finally {
      setSaving(false);
    }
  };

  const onIniciar = async (etapa: EtapaProduccion) => {
    if (!seleccionada) return;
    try {
      setSaving(true);
      setProdError("");
      const resp = responsableDraft[etapa.id] || etapa.responsable || undefined;
      await iniciarEtapa(seleccionada.numero, etapa.id, resp);
      await cargarEtapas(seleccionada.numero);
    } catch (err: any) {
      setProdError(err?.message || "No se pudo iniciar");
    } finally {
      setSaving(false);
    }
  };

  const onPausar = async (etapa: EtapaProduccion) => {
    if (!seleccionada) return;
    try {
      setSaving(true);
      await pausarEtapa(seleccionada.numero, etapa.id);
      await cargarEtapas(seleccionada.numero);
    } catch (err: any) {
      setProdError(err?.message || "No se pudo pausar");
    } finally {
      setSaving(false);
    }
  };

  const onTerminar = async (etapa: EtapaProduccion) => {
    if (!seleccionada) return;
    try {
      setSaving(true);
      await terminarEtapa(seleccionada.numero, etapa.id);
      await cargarEtapas(seleccionada.numero);
    } catch (err: any) {
      setProdError(err?.message || "No se pudo terminar");
    } finally {
      setSaving(false);
    }
  };

  const onAsignar = async (etapa: EtapaProduccion) => {
    if (!seleccionada) return;
    const nombre = (responsableDraft[etapa.id] || "").trim();
    if (!nombre) {
      setProdError("Escribe un responsable");
      return;
    }
    try {
      setSaving(true);
      await asignarResponsable(seleccionada.numero, etapa.id, nombre);
      await cargarEtapas(seleccionada.numero);
    } catch (err: any) {
      setProdError(err?.message || "No se pudo asignar");
    } finally {
      setSaving(false);
    }
  };
  const cargarEstadoFinal = async (numeroOT: string) => {
    try {
      setLoadingFinal(true);
      const r = await obtenerEstadoFinal(numeroOT);
      setEstadoFinal(r);
      if (r.controlCalidad) {
        setQcAprobado(r.controlCalidad.aprobado);
        setQcObs(r.controlCalidad.observaciones || "");
        setQcInspector(r.controlCalidad.inspector || "");
      }
    } catch {
      setEstadoFinal(null);
    } finally {
      setLoadingFinal(false);
    }
  };

  const onRegistrarQC = async () => {
    if (!seleccionada) return;
    try {
      setSaving(true);
      setQcError("");
      const r = await registrarControlCalidad({
        numeroOT: seleccionada.numero,
        aprobado: qcAprobado,
        observaciones: qcObs.trim() || undefined,
        inspector: qcInspector.trim() || undefined,
      });
      setEstadoFinal(r);
      await cargarEtapas(seleccionada.numero);
    } catch (err: any) {
      setQcError(err?.message || "No se pudo registrar el control de calidad");
    } finally {
      setSaving(false);
    }
  };

  const onRegistrarEntrega = async () => {
    if (!seleccionada) return;
    if (!entRecibidoPor.trim()) {
      setEntError("Indica quién recibe el vehículo");
      return;
    }
    try {
      setSaving(true);
      setEntError("");
      const r = await registrarEntrega({
        numeroOT: seleccionada.numero,
        recibidoPor: entRecibidoPor.trim(),
        entregadoPor: entEntregadoPor.trim() || undefined,
        kilometraje: entKm ? Number(entKm) : undefined,
        observaciones: entObs.trim() || undefined,
        conformidad: entConformidad,
      });
      setEstadoFinal(r);
    } catch (err: any) {
      setEntError(err?.message || "No se pudo registrar la entrega");
    } finally {
      setSaving(false);
    }
  };
  useEffect(() => {
    if (!seleccionada) return;
    const fresh = ordenes.find((o) => o.id === seleccionada.id);
    if (fresh) setSeleccionada(fresh);
  }, [ordenes, seleccionada?.id]);

  return (
    <div className="flex-1 w-full flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400">
            <ClipboardList size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">
              Órdenes de trabajo
            </h1>
            <p className="text-sm text-white/50">
              {dataFiltrada.length} de {ordenes.length} órdenes
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Select
            value={filtroEstado}
            onValueChange={(value) => {
              if (value != null) setFiltroEstado(value);
            }}
          >
            <SelectTrigger className="w-full sm:w-44 bg-white/5 border-white/10">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos los estados</SelectItem>
              {ESTADOS.map((e) => (
                <SelectItem key={e} value={e}>
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative w-full sm:w-64">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
            />
            <Input
              className="pl-9 bg-white/5 border-white/10 placeholder:text-white/30"
              placeholder="OT, placa, cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {can("ordenes.write") && (
            <Button
              onClick={abrirCrear}
              className="bg-emerald-600 hover:bg-emerald-500 shrink-0"
            >
              <Plus size={16} className="mr-1.5" />
              Nueva OT
            </Button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1">
        {dataFiltrada.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3 text-center">
              <ClipboardList size={32} className="text-white/20" />
              <p className="text-white/50 text-sm">
                {search || filtroEstado !== "TODOS"
                  ? "No hay órdenes con ese filtro"
                  : "No hay órdenes registradas"}
              </p>
              {!search && filtroEstado === "TODOS" && (
                <Button
                  onClick={abrirCrear}
                  variant="outline"
                  className="border-white/10 "
                >
                  <Plus size={14} className="mr-1.5" />
                  Crear primera OT
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {dataFiltrada.map((ot) => (
              <OrdenCard key={ot.id} data={ot} onClick={abrirDetalle} />
            ))}
          </div>
        )}
      </div>

      {/* MODAL DETALLE */}
      <Dialog open={openDetail} onOpenChange={setOpenDetail}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{seleccionada?.numero}</DialogTitle>
            <DialogDescription className="text-white/50">
              {seleccionada?.placa} · {seleccionada?.clienteNombre || "—"}
            </DialogDescription>
          </DialogHeader>

          {seleccionada && (
            <Tabs value={tab} onValueChange={setTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5 ">
                <TabsTrigger value="resumen">Resumen</TabsTrigger>
                <TabsTrigger value="cotizacion">Cotización</TabsTrigger>
                {can("pagos.write") && (
                  <TabsTrigger value="pagos">Pagos</TabsTrigger>
                )}
                <TabsTrigger value="produccion">Producción</TabsTrigger>
                <TabsTrigger value="entrega">QC / Entrega</TabsTrigger>
              </TabsList>

              {/* ===== RESUMEN ===== */}
              <TabsContent
                value="resumen"
                className="flex flex-col gap-4 mt-4 text-sm"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-white/40 mb-1">Vehículo</p>
                    <p className="text-white">
                      {[seleccionada.marca, seleccionada.modelo]
                        .filter(Boolean)
                        .join(" ") || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 mb-1">Ingreso</p>
                    <p className="text-white">
                      {fmtDate(seleccionada.fechaIngreso, "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 rounded-xl bg-white/5 p-3">
                  <div>
                    <p className="text-[10px] text-white/40">Total</p>
                    <p className="font-medium text-white">
                      {formatoSoles(seleccionada.total)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/40">Pagado</p>
                    <p className="font-medium text-emerald-400">
                      {formatoSoles(seleccionada.totalPagado)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/40">Saldo</p>
                    <p
                      className={`font-medium ${
                        seleccionada.saldoPendiente > 0
                          ? "text-rose-400"
                          : "text-white/50"
                      }`}
                    >
                      {formatoSoles(seleccionada.saldoPendiente)}
                    </p>
                  </div>
                </div>

                {seleccionada.observaciones && (
                  <div>
                    <p className="text-xs text-white/40 mb-1">Observaciones</p>
                    <p className="text-white/80">
                      {seleccionada.observaciones}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Estado OT</Label>
                  <Select
                    value={estadoEdit}
                    onValueChange={(v) => setEstadoEdit(v as EstadoOT)}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS.map((e) => (
                        <SelectItem key={e} value={e}>
                          {e}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {detailError && (
                  <p className="text-sm text-rose-400">{detailError}</p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setOpenDetail(false)}
                    className="border-white/10 "
                  >
                    Cerrar
                  </Button>
                  <Button
                    onClick={guardarEstado}
                    disabled={saving || estadoEdit === seleccionada.estado}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40"
                  >
                    {saving ? "Guardando..." : "Actualizar estado"}
                  </Button>
                </div>
              </TabsContent>

              {/* ===== COTIZACIÓN ===== */}
              <TabsContent
                value="cotizacion"
                className="flex flex-col gap-4 mt-4"
              >
                {loadingCot ? (
                  <p className="text-sm text-white/50 text-center py-6">
                    Cargando ítems...
                  </p>
                ) : (
                  <>
                    {/* Lista de ítems */}
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {!cotizacion?.items?.length ? (
                        <p className="text-sm text-white/40 text-center py-4">
                          Sin ítems. Agrega un servicio.
                        </p>
                      ) : (
                        cotizacion.items.map((it: ItemCotizacion) => (
                          <div
                            key={it.id}
                            className="flex items-start justify-between gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-sm"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-white truncate">
                                {it.nombre}
                              </p>
                              <p className="text-xs text-white/40">
                                {it.cantidad} ×{" "}
                                {formatoSoles(it.precioUnitario)}
                                {it.descuento > 0
                                  ? ` − desc. ${formatoSoles(it.descuento)}`
                                  : ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-emerald-400 font-medium">
                                {formatoSoles(it.subtotal)}
                              </span>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-rose-400 hover:bg-rose-500/10"
                                disabled={saving}
                                onClick={() => borrarItem(it.id)}
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Totales cotización */}
                    {cotizacion && (
                      <div className="flex justify-between text-sm border-t border-white/10 pt-2">
                        <span className="text-white/50">Total cotizado</span>
                        <span className="font-semibold text-white">
                          {formatoSoles(cotizacion.total)}
                        </span>
                      </div>
                    )}

                    {/* Form agregar */}
                    <div className="space-y-3 rounded-xl border border-white/10 p-3">
                      <p className="text-xs font-medium text-emerald-400 uppercase tracking-wide">
                        Agregar ítem
                      </p>

                      {servicios.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-xs">Desde catálogo</Label>
                          <Select
                            value={itemCatalogoId || "manual"}
                            onValueChange={(v) => {
                              if (v === "manual") {
                                setItemCatalogoId("");
                                return;
                              }
                              onPickCatalogo(v);
                            }}
                          >
                            <SelectTrigger className="bg-white/5 border-white/10">
                              <SelectValue placeholder="Elegir servicio..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manual">Manual</SelectItem>
                              {servicios.map((s) => (
                                <SelectItem key={s.id} value={s}>
                                  {s.nombre} — {formatoSoles(s.precioBase)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label className="text-xs">Nombre *</Label>
                        <Input
                          value={itemNombre}
                          onChange={(e) => setItemNombre(e.target.value)}
                          className="bg-white/5 border-white/10 h-9"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Cant.</Label>
                          <Input
                            type="number"
                            min="1"
                            value={itemCant}
                            onChange={(e) => setItemCant(e.target.value)}
                            className="bg-white/5 border-white/10 h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Precio</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={itemPrecio}
                            onChange={(e) => setItemPrecio(e.target.value)}
                            className="bg-white/5 border-white/10 h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Desc.</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={itemDescmto}
                            onChange={(e) => setItemDescmto(e.target.value)}
                            className="bg-white/5 border-white/10 h-9"
                          />
                        </div>
                      </div>

                      {itemError && (
                        <p className="text-xs text-rose-400">{itemError}</p>
                      )}
                      {can("cotizacion.write") ? (
                        <Button
                          type="button"
                          onClick={guardarItem}
                          disabled={saving}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 h-9"
                        >
                          <Plus size={14} className="mr-1.5" />
                          {saving ? "Agregando..." : "Agregar a la OT"}
                        </Button>
                      ) : null}
                    </div>
                  </>
                )}
              </TabsContent>

              {/*PAGOS*/}
              <TabsContent value="pagos" className="flex flex-col gap-4 mt-4">
                {loadingPagos ? (
                  <p className="text-sm text-white/50 text-center py-6">
                    Cargando pagos...
                  </p>
                ) : (
                  <>
                    {/* Resumen montos */}
                    <div className="grid grid-cols-3 gap-2 rounded-xl bg-white/5 p-3 text-sm">
                      <div>
                        <p className="text-[10px] text-white/40">Total OT</p>
                        <p className="font-medium text-white">
                          {formatoSoles(
                            resumenPagos?.total ?? seleccionada?.total ?? 0,
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/40">Cobrado</p>
                        <p className="font-medium text-emerald-400">
                          {formatoSoles(
                            resumenPagos?.totalPagado ??
                              seleccionada?.totalPagado ??
                              0,
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/40">Saldo</p>
                        <p
                          className={`font-medium ${
                            (resumenPagos?.saldoPendiente ??
                              seleccionada?.saldoPendiente ??
                              0) > 0
                              ? "text-rose-400"
                              : "text-white/50"
                          }`}
                        >
                          {formatoSoles(
                            resumenPagos?.saldoPendiente ??
                              seleccionada?.saldoPendiente ??
                              0,
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Historial de pagos */}
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {!resumenPagos?.pagos?.length ? (
                        <p className="text-sm text-white/40 text-center py-4">
                          Aún no hay pagos registrados
                        </p>
                      ) : (
                        resumenPagos.pagos.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-start justify-between gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-sm"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-white">
                                {formatoSoles(p.monto)}
                                <span className="ml-2 text-xs text-emerald-400/90 font-normal">
                                  {p.metodo}
                                </span>
                              </p>
                              <p className="text-xs text-white/40">
                                {p.fecha
                                  ? fmtDate(p.fecha, "dd/MM/yyyy HH:mm")
                                  : "—"}
                                {p.comprobante ? ` · ${p.comprobante}` : ""}
                              </p>
                              {p.observaciones && (
                                <p className="text-xs text-white/50 mt-0.5 truncate">
                                  {p.observaciones}
                                </p>
                              )}
                            </div>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-rose-400 hover:bg-rose-500/10 shrink-0"
                              disabled={saving}
                              onClick={() => borrarPago(p.id)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Form registrar pago */}
                    <div className="space-y-3 rounded-xl border border-white/10 p-3">
                      <p className="text-xs font-medium text-emerald-400 uppercase tracking-wide">
                        Registrar pago
                      </p>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Monto (S/) *</Label>
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={pagoMonto}
                            onChange={(e) => setPagoMonto(e.target.value)}
                            placeholder="100.00"
                            className="bg-white/5 border-white/10 h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Método *</Label>
                          <Select
                            value={pagoMetodo}
                            onValueChange={(value) => {
                              if (value != null) setPagoMetodo(value);
                            }}
                          >
                            <SelectTrigger className="bg-white/5 border-white/10 h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {METODOS.map((m) => (
                                <SelectItem key={m} value={m}>
                                  {m}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Comprobante</Label>
                        <Input
                          value={pagoComprobante}
                          onChange={(e) => setPagoComprobante(e.target.value)}
                          placeholder="OP-123 / Nro operación"
                          className="bg-white/5 border-white/10 h-9"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Observaciones</Label>
                        <Input
                          value={pagoObs}
                          onChange={(e) => setPagoObs(e.target.value)}
                          placeholder="Adelanto, saldo, etc."
                          className="bg-white/5 border-white/10 h-9"
                        />
                      </div>

                      {pagoError && (
                        <p className="text-xs text-rose-400">{pagoError}</p>
                      )}

                      <Button
                        type="button"
                        onClick={guardarPago}
                        disabled={saving}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 h-9"
                      >
                        <Plus size={14} className="mr-1.5" />
                        {saving ? "Registrando..." : "Registrar pago"}
                      </Button>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent
                value="produccion"
                className="flex flex-col gap-4 mt-4"
              >
                {loadingEtapas ? (
                  <p className="text-sm text-white/50 text-center py-6">
                    Cargando etapas...
                  </p>
                ) : (
                  <>
                    {/* Sin etapas → generar plantilla */}
                    {!resumenEtapas?.etapas?.length ? (
                      <div className="space-y-3 rounded-xl border border-white/10 p-4">
                        <p className="text-sm text-white/60">
                          Esta OT aún no tiene etapas de producción.
                        </p>
                        <div className="space-y-2">
                          <Label className="text-xs">Plantilla</Label>
                          <Select
                            value={tipoPlantilla}
                            onValueChange={(value) => {
                              if (value != null) setTipoPlantilla(value);
                            }}
                          >
                            <SelectTrigger className="bg-white/5 border-white/10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PLANTILLAS_UI.map((p) => (
                                <SelectItem key={p.value} value={p.value}>
                                  {p.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          onClick={onGenerarEtapas}
                          disabled={saving}
                          className="w-full bg-emerald-600 hover:bg-emerald-500"
                        >
                          {saving ? "Generando..." : "Generar etapas"}
                        </Button>
                      </div>
                    ) : (
                      <>
                        {/* Progreso */}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white/50">
                            {
                              resumenEtapas.etapas.filter(
                                (e) => e.estado === "TERMINADO",
                              ).length
                            }{" "}
                            / {resumenEtapas.etapas.length} terminadas
                          </span>
                          <span className="text-xs text-white/40">
                            OT: {resumenEtapas.estadoOT}
                          </span>
                        </div>

                        <div className="space-y-2 max-h-72 overflow-y-auto">
                          {resumenEtapas.etapas.map((etapa) => {
                            const color =
                              COLOR_ETAPA[etapa.estado] || "#94a3b8";
                            return (
                              <div
                                key={etapa.id}
                                className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-white">
                                      <span className="text-white/40 mr-1.5">
                                        {etapa.secuencia}.
                                      </span>
                                      {etapa.nombre}
                                    </p>
                                    <p className="text-xs text-white/40 mt-0.5">
                                      {etapa.responsable
                                        ? `Resp: ${etapa.responsable}`
                                        : "Sin responsable"}
                                    </p>
                                  </div>
                                  <span
                                    className="text-[10px] px-2 py-0.5 rounded-md shrink-0 font-medium"
                                    style={{
                                      backgroundColor: `${color}22`,
                                      color,
                                    }}
                                  >
                                    {etapa.estado}
                                  </span>
                                </div>

                                {/* Responsable */}
                                {etapa.estado !== "TERMINADO" && (
                                  <div className="flex gap-2">
                                    <Input
                                      value={
                                        responsableDraft[etapa.id] ??
                                        etapa.responsable ??
                                        ""
                                      }
                                      onChange={(e) =>
                                        setResponsableDraft((d) => ({
                                          ...d,
                                          [etapa.id]: e.target.value,
                                        }))
                                      }
                                      placeholder="Responsable"
                                      className="bg-white/5 border-white/10 h-8 text-xs"
                                    />
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="h-8 border-white/10 text-white/70 shrink-0"
                                      disabled={saving}
                                      onClick={() => onAsignar(etapa)}
                                    >
                                      Asignar
                                    </Button>
                                  </div>
                                )}

                                {/* Acciones */}
                                {etapa.estado !== "TERMINADO" && (
                                  <div className="flex flex-wrap gap-2">
                                    {(etapa.estado === "PENDIENTE" ||
                                      etapa.estado === "PAUSADO") && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        className="h-8 bg-amber-600 hover:bg-amber-500"
                                        disabled={saving}
                                        onClick={() => onIniciar(etapa)}
                                      >
                                        Iniciar
                                      </Button>
                                    )}
                                    {etapa.estado === "EN_PROCESO" && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-8 border-violet-500/30 text-violet-300"
                                        disabled={saving}
                                        onClick={() => onPausar(etapa)}
                                      >
                                        Pausar
                                      </Button>
                                    )}
                                    {(etapa.estado === "EN_PROCESO" ||
                                      etapa.estado === "PAUSADO" ||
                                      etapa.estado === "PENDIENTE") && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        className="h-8 bg-emerald-600 hover:bg-emerald-500"
                                        disabled={saving}
                                        onClick={() => onTerminar(etapa)}
                                      >
                                        Terminar
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {prodError && (
                      <p className="text-xs text-rose-400">{prodError}</p>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="entrega" className="flex flex-col gap-5 mt-4">
                {loadingFinal ? (
                  <p className="text-sm text-white/50 text-center py-6">
                    Cargando...
                  </p>
                ) : (
                  <>
                    {/* Estado rápido */}
                    {estadoFinal && (
                      <div className="grid grid-cols-2 gap-2 rounded-xl bg-white/5 p-3 text-xs">
                        <div>
                          <p className="text-white/40">Estado OT</p>
                          <p className="font-medium text-white">
                            {estadoFinal.estado}
                          </p>
                        </div>
                        <div>
                          <p className="text-white/40">Etapas</p>
                          <p className="font-medium text-white">
                            {estadoFinal.etapasCompletadas}/
                            {estadoFinal.totalEtapas}
                          </p>
                        </div>
                        <div>
                          <p className="text-white/40">Saldo</p>
                          <p
                            className={`font-medium ${
                              estadoFinal.saldoPendiente > 0
                                ? "text-rose-400"
                                : "text-emerald-400"
                            }`}
                          >
                            {formatoSoles(estadoFinal.saldoPendiente)}
                          </p>
                        </div>
                        <div>
                          <p className="text-white/40">QC</p>
                          <p className="font-medium text-white">
                            {estadoFinal.controlCalidad
                              ? estadoFinal.controlCalidad.aprobado
                                ? "Aprobado"
                                : "Rechazado"
                              : "Pendiente"}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* ===== CONTROL DE CALIDAD ===== */}
                    <div className="space-y-3 rounded-xl border border-white/10 p-3">
                      <p className="text-xs font-medium text-emerald-400 uppercase tracking-wide">
                        Control de calidad
                      </p>

                      {estadoFinal?.controlCalidad && (
                        <p className="text-xs text-white/50">
                          Último registro:{" "}
                          {estadoFinal.controlCalidad.aprobado ? (
                            <span className="text-emerald-400">Aprobado</span>
                          ) : (
                            <span className="text-rose-400">Rechazado</span>
                          )}
                          {estadoFinal.controlCalidad.inspector
                            ? ` · ${estadoFinal.controlCalidad.inspector}`
                            : ""}
                        </p>
                      )}

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={qcAprobado ? "default" : "outline"}
                          className={
                            qcAprobado
                              ? "bg-emerald-600 hover:bg-emerald-500"
                              : "border-white/10 text-white/60"
                          }
                          onClick={() => setQcAprobado(true)}
                        >
                          Aprobar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={!qcAprobado ? "default" : "outline"}
                          className={
                            !qcAprobado
                              ? "bg-rose-600 hover:bg-rose-500"
                              : "border-white/10 text-white/60"
                          }
                          onClick={() => setQcAprobado(false)}
                        >
                          Rechazar
                        </Button>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Inspector</Label>
                        <Input
                          value={qcInspector}
                          onChange={(e) => setQcInspector(e.target.value)}
                          placeholder="Nombre de quien revisa"
                          className="bg-white/5 border-white/10 h-9"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Observaciones</Label>
                        <Input
                          value={qcObs}
                          onChange={(e) => setQcObs(e.target.value)}
                          placeholder="Detalle de la inspección"
                          className="bg-white/5 border-white/10 h-9"
                        />
                      </div>

                      {qcError && (
                        <p className="text-xs text-rose-400">{qcError}</p>
                      )}

                      <Button
                        type="button"
                        onClick={onRegistrarQC}
                        disabled={saving}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 h-9"
                      >
                        {saving
                          ? "Guardando..."
                          : "Registrar control de calidad"}
                      </Button>

                      <p className="text-[11px] text-white/30">
                        Requiere todas las etapas en TERMINADO. Si rechazas, la
                        OT vuelve a EN_PROCESO.
                      </p>
                    </div>

                    {/* ===== ENTREGA ===== */}
                    <div className="space-y-3 rounded-xl border border-white/10 p-3">
                      <p className="text-xs font-medium text-emerald-400 uppercase tracking-wide">
                        Entrega al cliente
                      </p>

                      {estadoFinal?.entrega ? (
                        <div className="text-sm space-y-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
                          <p className="text-emerald-400 font-medium">
                            Ya entregado
                          </p>
                          <p className="text-white/70 text-xs">
                            Recibió: {estadoFinal.entrega.recibidoPor || "—"}
                          </p>
                          <p className="text-white/70 text-xs">
                            Entregó: {estadoFinal.entrega.entregadoPor || "—"}
                          </p>
                          {estadoFinal.entrega.fecha && (
                            <p className="text-white/40 text-xs">
                              {fmtDate(
                                estadoFinal.entrega.fecha,
                                "dd/MM/yyyy HH:mm",
                              )}
                            </p>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="space-y-1">
                            <Label className="text-xs">
                              Recibido por{" "}
                              <span className="text-rose-400">*</span>
                            </Label>
                            <Input
                              value={entRecibidoPor}
                              onChange={(e) =>
                                setEntRecibidoPor(e.target.value)
                              }
                              placeholder="Nombre de quien retira"
                              className="bg-white/5 border-white/10 h-9"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Entregado por</Label>
                            <Input
                              value={entEntregadoPor}
                              onChange={(e) =>
                                setEntEntregadoPor(e.target.value)
                              }
                              placeholder="Personal de Renova"
                              className="bg-white/5 border-white/10 h-9"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">
                              Kilometraje salida
                            </Label>
                            <Input
                              type="number"
                              value={entKm}
                              onChange={(e) => setEntKm(e.target.value)}
                              placeholder="45200"
                              className="bg-white/5 border-white/10 h-9"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Observaciones</Label>
                            <Input
                              value={entObs}
                              onChange={(e) => setEntObs(e.target.value)}
                              className="bg-white/5 border-white/10 h-9"
                            />
                          </div>

                          <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={entConformidad}
                              onChange={(e) =>
                                setEntConformidad(e.target.checked)
                              }
                              className="rounded border-white/20"
                            />
                            Cliente conforme / firma recibida
                          </label>

                          {entError && (
                            <p className="text-xs text-rose-400">{entError}</p>
                          )}

                          <Button
                            type="button"
                            onClick={onRegistrarEntrega}
                            disabled={saving}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 h-9"
                          >
                            {saving ? "Registrando..." : "Confirmar entrega"}
                          </Button>

                          <p className="text-[11px] text-white/30">
                            Requiere QC aprobado y saldo en 0. La OT pasa a
                            ENTREGADO.
                          </p>
                        </>
                      )}
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL CREAR */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva orden de trabajo</DialogTitle>
            <DialogDescription className="text-white/50">
              La OT se crea a partir de una placa registrada
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="space-y-2">
              <Label>
                Placa <span className="text-rose-400">*</span>
              </Label>
              <Input
                value={busquedaPlaca || placaCreate}
                onChange={(e) => {
                  const v = e.target.value.toUpperCase();
                  setBusquedaPlaca(v);
                  setPlacaCreate(v);
                }}
                placeholder="ABC-123"
                className="bg-white/5 border-white/10 font-semibold tracking-wider"
              />
              <div className="max-h-36 overflow-y-auto rounded-lg border border-white/10 p-1 space-y-1">
                {placasFiltradas.length === 0 ? (
                  <p className="text-xs text-white/40 p-2 text-center">
                    No hay vehículos. Registra uno primero.
                  </p>
                ) : (
                  placasFiltradas.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setPlacaCreate(v.placa);
                        setBusquedaPlaca(v.placa);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        placaCreate === v.placa
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "hover:bg-white/5 text-white/80"
                      }`}
                    >
                      <span className="font-semibold tracking-wide">
                        {v.placa}
                      </span>
                      <span className="text-white/40 ml-2 text-xs">
                        {v.marca} {v.modelo}
                        {v.clienteNombre ? ` · ${v.clienteNombre}` : ""}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Kilometraje</Label>
              <Input
                type="number"
                value={kmCreate}
                onChange={(e) => setKmCreate(e.target.value)}
                placeholder="45000"
                className="bg-white/5 border-white/10"
              />
            </div>

            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Input
                value={obsCreate}
                onChange={(e) => setObsCreate(e.target.value)}
                placeholder="Rayón lateral, etc."
                className="bg-white/5 border-white/10"
              />
            </div>

            {createError && (
              <p className="text-sm text-rose-400">{createError}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpenCreate(false)}
              disabled={saving}
              className="border-white/10"
            >
              <X size={14} className="mr-1.5" />
              Cancelar
            </Button>
            <Button
              onClick={guardarNueva}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              {saving ? "Creando..." : "Crear OT"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
