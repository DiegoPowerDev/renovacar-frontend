"use client";

import { useMemo, useState } from "react";
import { useVehiculosStore, type Vehiculo } from "@/stores/useVehiculosStore";
import { useClientesStore } from "@/stores/useClientesStore";
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
  Search,
  Car,
  User,
  Palette,
  Calendar,
  Hash,
  Plus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { formatDate } from "date-fns";

type VehiculoForm = {
  placa: string;
  marca: string;
  modelo: string;
  anio: string;
  color: string;
  vin: string;
};

type ClienteCreateForm = {
  nombre: string;
  dniRuc: string;
  telefono: string;
  whatsapp: string;
  correo: string;
};

const vehiculoVacio: VehiculoForm = {
  placa: "",
  marca: "",
  modelo: "",
  anio: "",
  color: "",
  vin: "",
};

const clienteVacio: ClienteCreateForm = {
  nombre: "",
  dniRuc: "",
  telefono: "",
  whatsapp: "",
  correo: "",
};

function fmtDate(
  value: Date | string | null | undefined,
  pattern = "dd MMM yyyy",
) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  return formatDate(d, pattern);
}

// ======================
// CARD
// ======================
interface CardProps {
  data: Vehiculo;
  onClick: (vehiculo: Vehiculo) => void;
}

const VehicleCard = ({ data, onClick }: CardProps) => {
  const {
    placa,
    marca,
    modelo,
    anio,
    color,
    creadoEn,
    cliente,
    clienteNombre,
  } = data;

  return (
    <button
      type="button"
      onClick={() => onClick(data)}
      className="group relative flex flex-col gap-4 p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-emerald-500/40 transition-all duration-200 text-left w-full"
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
          <Car size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30">
            <span className="font-bold text-emerald-400 tracking-wider text-sm">
              {placa}
            </span>
          </div>
          <p className="text-xs text-white/50 mt-1.5 truncate">
            {marca} {modelo}
            {anio ? ` · ${anio}` : ""}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 text-sm">
        <div className="flex items-center gap-2.5 text-white/70">
          <User size={15} className="shrink-0 text-white/40" />
          <span className="truncate">
            {cliente?.nombre || clienteNombre || "Sin dueño"}
          </span>
        </div>
        <div className="flex items-center gap-2.5 text-white/70">
          <Palette size={15} className="shrink-0 text-white/40" />
          <span className="truncate">{color || "Sin color"}</span>
        </div>
        <div className="flex items-center gap-2.5 text-white/70">
          <Hash size={15} className="shrink-0 text-white/40" />
          <span className="truncate">
            {marca} {modelo}
          </span>
        </div>
        <div className="flex items-center gap-2.5 text-white/70">
          <Calendar size={15} className="shrink-0 text-white/40" />
          <span className="truncate">{fmtDate(creadoEn)}</span>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-200 rounded-b-2xl" />
    </button>
  );
};

// ======================
// DASHBOARD
// ======================
export default function VehiclessDashboard() {
  const {
    vehiculos,
    loading,
    error: storeError,
    create,
    update,
    remove,
  } = useVehiculosStore();

  const { clientes } = useClientesStore();

  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const [openDetail, setOpenDetail] = useState(false);
  const [seleccionado, setSeleccionado] = useState<Vehiculo | null>(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [form, setForm] = useState<VehiculoForm>(vehiculoVacio);
  const [formError, setFormError] = useState("");

  const [openCreate, setOpenCreate] = useState(false);
  const [createVehiculo, setCreateVehiculo] =
    useState<VehiculoForm>(vehiculoVacio);
  const [createCliente, setCreateCliente] =
    useState<ClienteCreateForm>(clienteVacio);
  const [modoCliente, setModoCliente] = useState<"existente" | "nuevo">(
    "existente",
  );
  const [clienteIdSeleccionado, setClienteIdSeleccionado] = useState("");
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [createError, setCreateError] = useState("");

  const [openDelete, setOpenDelete] = useState(false);

  const dataFiltrada = useMemo(() => {
    if (!search.trim()) return vehiculos;
    const term = search.toLowerCase().trim();
    return vehiculos.filter((v) => {
      return (
        v.placa?.toLowerCase().includes(term) ||
        v.marca?.toLowerCase().includes(term) ||
        v.modelo?.toLowerCase().includes(term) ||
        v.color?.toLowerCase().includes(term) ||
        v.anio?.toString().includes(term) ||
        v.cliente?.nombre?.toLowerCase().includes(term) ||
        v.clienteNombre?.toLowerCase().includes(term)
      );
    });
  }, [vehiculos, search]);

  const clientesFiltrados = useMemo(() => {
    if (!busquedaCliente.trim()) return clientes.slice(0, 8);
    const term = busquedaCliente.toLowerCase().trim();
    return clientes
      .filter(
        (c) =>
          c.nombre?.toLowerCase().includes(term) ||
          c.dniRuc?.toLowerCase().includes(term) ||
          c.telefono?.includes(term) ||
          c.whatsapp?.includes(term),
      )
      .slice(0, 8);
  }, [clientes, busquedaCliente]);

  const hayCambios = useMemo(() => {
    if (!seleccionado) return false;
    return (
      form.placa.trim().toUpperCase() !== (seleccionado.placa || "") ||
      form.marca.trim() !== (seleccionado.marca || "") ||
      form.modelo.trim() !== (seleccionado.modelo || "") ||
      form.anio.trim() !== (seleccionado.anio?.toString() || "") ||
      form.color.trim() !== (seleccionado.color || "") ||
      form.vin.trim() !== (seleccionado.vin || "")
    );
  }, [form, seleccionado]);

  const abrirDetalle = (vehiculo: Vehiculo) => {
    setSeleccionado(vehiculo);
    setForm({
      placa: vehiculo.placa || "",
      marca: vehiculo.marca || "",
      modelo: vehiculo.modelo || "",
      anio: vehiculo.anio?.toString() || "",
      color: vehiculo.color || "",
      vin: vehiculo.vin || "",
    });
    setModoEdicion(false);
    setFormError("");
    setOpenDetail(true);
  };

  const activarEdicion = () => {
    setModoEdicion(true);
    setFormError("");
  };

  const cancelarEdicion = () => {
    if (!seleccionado) return;
    setForm({
      placa: seleccionado.placa || "",
      marca: seleccionado.marca || "",
      modelo: seleccionado.modelo || "",
      anio: seleccionado.anio?.toString() || "",
      color: seleccionado.color || "",
      vin: seleccionado.vin || "",
    });
    setModoEdicion(false);
    setFormError("");
  };

  const guardarEdicion = async () => {
    if (!seleccionado) return;
    if (!hayCambios) {
      setModoEdicion(false);
      return;
    }
    if (!form.placa.trim() || !form.marca.trim() || !form.modelo.trim()) {
      setFormError("Placa, marca y modelo son obligatorios");
      return;
    }

    try {
      setSaving(true);
      setFormError("");
      const actualizado = await update(seleccionado.id, {
        placa: form.placa.trim().toUpperCase(),
        marca: form.marca.trim(),
        modelo: form.modelo.trim(),
        anio: form.anio ? Number(form.anio) : undefined,
        color: form.color.trim() || undefined,
        vin: form.vin.trim() || undefined,
      });
      setSeleccionado(actualizado);
      setModoEdicion(false);
    } catch (err: any) {
      setFormError(err?.message || "Error al guardar los cambios");
    } finally {
      setSaving(false);
    }
  };

  const abrirCrear = () => {
    setCreateVehiculo(vehiculoVacio);
    setCreateCliente(clienteVacio);
    setModoCliente("existente");
    setClienteIdSeleccionado("");
    setBusquedaCliente("");
    setCreateError("");
    setOpenCreate(true);
  };

  const guardarNuevo = async () => {
    if (
      !createVehiculo.placa.trim() ||
      !createVehiculo.marca.trim() ||
      !createVehiculo.modelo.trim()
    ) {
      setCreateError("Placa, marca y modelo son obligatorios");
      return;
    }
    if (modoCliente === "existente" && !clienteIdSeleccionado) {
      setCreateError("Selecciona un cliente existente");
      return;
    }
    if (modoCliente === "nuevo" && !createCliente.nombre.trim()) {
      setCreateError("El nombre del dueño es obligatorio");
      return;
    }

    try {
      setSaving(true);
      setCreateError("");

      const base = {
        placa: createVehiculo.placa.trim().toUpperCase(),
        marca: createVehiculo.marca.trim(),
        modelo: createVehiculo.modelo.trim(),
        anio: createVehiculo.anio ? Number(createVehiculo.anio) : undefined,
        color: createVehiculo.color.trim() || undefined,
        vin: createVehiculo.vin.trim() || undefined,
      };

      if (modoCliente === "existente") {
        await create({ ...base, clienteId: clienteIdSeleccionado });
      } else {
        await create({
          ...base,
          cliente: {
            nombre: createCliente.nombre.trim(),
            dniRuc: createCliente.dniRuc.trim() || undefined,
            telefono: createCliente.telefono.trim() || undefined,
            whatsapp: createCliente.whatsapp.trim() || undefined,
            correo: createCliente.correo.trim() || undefined,
          },
        });
      }

      setOpenCreate(false);
    } catch (err: any) {
      setCreateError(err?.message || "Error al registrar el vehículo");
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async () => {
    if (!seleccionado) return;
    try {
      setSaving(true);
      await remove(seleccionado.id);
      setOpenDelete(false);
      setOpenDetail(false);
      setSeleccionado(null);
    } catch (err: any) {
      setFormError(err?.message || "No se pudo eliminar el vehículo");
      setOpenDelete(false);
    } finally {
      setSaving(false);
    }
  };

  const error = storeError || "";
  const dueño =
    seleccionado?.cliente?.nombre || seleccionado?.clienteNombre || null;

  return (
    <div className="flex-1 w-full flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400">
            <Car size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Vehículos</h1>
            <p className="text-sm text-white/50">
              {loading
                ? "Cargando..."
                : `${dataFiltrada.length} de ${vehiculos.length} vehículos`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
            />
            <Input
              className="pl-9 bg-white/5 border-white/10 focus-visible:ring-emerald-500/50 placeholder:text-white/30"
              type="text"
              placeholder="Buscar placa, marca, dueño..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            onClick={abrirCrear}
            className="bg-emerald-600 hover:bg-emerald-500 shrink-0"
          >
            <Plus size={16} className="mr-1.5" />
            Nuevo
          </Button>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
              <p className="text-sm text-white/50">Cargando vehículos...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        ) : dataFiltrada.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3 text-center">
              <Car size={32} className="text-white/20" />
              <p className="text-white/50 text-sm">
                {search
                  ? "No se encontraron vehículos con ese criterio"
                  : "No hay vehículos registrados"}
              </p>
              {!search && (
                <Button
                  onClick={abrirCrear}
                  variant="outline"
                  className="border-white/10 text-white/70"
                >
                  <Plus size={14} className="mr-1.5" />
                  Registrar primer vehículo
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {dataFiltrada.map((vehiculo) => (
              <VehicleCard
                key={vehiculo.id}
                data={vehiculo}
                onClick={abrirDetalle}
              />
            ))}
          </div>
        )}
      </div>

      {/* MODAL DETALLE / EDITAR */}
      <Dialog
        open={openDetail}
        onOpenChange={(open) => {
          if (!open) {
            setOpenDetail(false);
            setModoEdicion(false);
          }
        }}
      >
        <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {modoEdicion ? "Editar vehículo" : "Detalle del vehículo"}
            </DialogTitle>
            <DialogDescription className="text-white/50">
              {modoEdicion
                ? "Modifica los campos y guarda los cambios"
                : dueño
                  ? `Dueño: ${dueño}`
                  : "Información del vehículo"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="space-y-2">
              <Label>Placa</Label>
              <Input
                value={form.placa}
                disabled={!modoEdicion}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    placa: e.target.value.toUpperCase(),
                  }))
                }
                className="bg-white/5 border-white/10 disabled:opacity-60 font-semibold tracking-wider"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Marca</Label>
                <Input
                  value={form.marca}
                  disabled={!modoEdicion}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, marca: e.target.value }))
                  }
                  className="bg-white/5 border-white/10 disabled:opacity-60"
                />
              </div>
              <div className="space-y-2">
                <Label>Modelo</Label>
                <Input
                  value={form.modelo}
                  disabled={!modoEdicion}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, modelo: e.target.value }))
                  }
                  className="bg-white/5 border-white/10 disabled:opacity-60"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Año</Label>
                <Input
                  type="number"
                  value={form.anio}
                  disabled={!modoEdicion}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, anio: e.target.value }))
                  }
                  className="bg-white/5 border-white/10 disabled:opacity-60"
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Input
                  value={form.color}
                  disabled={!modoEdicion}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, color: e.target.value }))
                  }
                  className="bg-white/5 border-white/10 disabled:opacity-60"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>VIN</Label>
              <Input
                value={form.vin}
                disabled={!modoEdicion}
                onChange={(e) =>
                  setForm((f) => ({ ...f, vin: e.target.value }))
                }
                className="bg-white/5 border-white/10 disabled:opacity-60"
              />
            </div>

            {seleccionado?.creadoEn && !modoEdicion && (
              <p className="text-xs text-white/40">
                Registrado el{" "}
                {fmtDate(seleccionado.creadoEn, "dd MMM yyyy HH:mm")}
              </p>
            )}
            {formError && <p className="text-sm text-rose-400">{formError}</p>}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {modoEdicion ? (
              <>
                <Button
                  variant="outline"
                  onClick={cancelarEdicion}
                  disabled={saving}
                  className="border-white/10 text-white/70"
                >
                  <X size={14} className="mr-1.5" />
                  Cancelar
                </Button>
                <Button
                  onClick={guardarEdicion}
                  disabled={saving || !hayCambios}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40"
                >
                  {saving ? "Guardando..." : "Guardar cambios"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setOpenDelete(true)}
                  className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                >
                  <Trash2 size={14} className="mr-1.5" />
                  Eliminar
                </Button>
                <Button
                  onClick={activarEdicion}
                  className="bg-emerald-600 hover:bg-emerald-500"
                >
                  <Pencil size={14} className="mr-1.5" />
                  Editar
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL CREAR — mismo JSX que tenías; solo cambia el handler guardarNuevo */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo vehículo</DialogTitle>
            <DialogDescription className="text-white/50">
              Registra el vehículo y asócialo a un dueño
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5 py-2">
            <p className="text-xs font-medium text-emerald-400 uppercase tracking-wide">
              Vehículo
            </p>
            {/* ... mismos campos de createVehiculo que ya tenías ... */}
            <div className="space-y-2">
              <Label>
                Placa <span className="text-rose-400">*</span>
              </Label>
              <Input
                value={createVehiculo.placa}
                onChange={(e) =>
                  setCreateVehiculo((f) => ({
                    ...f,
                    placa: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="ABC-123"
                className="bg-white/5 border-white/10 font-semibold tracking-wider"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>
                  Marca <span className="text-rose-400">*</span>
                </Label>
                <Input
                  value={createVehiculo.marca}
                  onChange={(e) =>
                    setCreateVehiculo((f) => ({ ...f, marca: e.target.value }))
                  }
                  placeholder="Toyota"
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Modelo <span className="text-rose-400">*</span>
                </Label>
                <Input
                  value={createVehiculo.modelo}
                  onChange={(e) =>
                    setCreateVehiculo((f) => ({ ...f, modelo: e.target.value }))
                  }
                  placeholder="Yaris"
                  className="bg-white/5 border-white/10"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Año</Label>
                <Input
                  type="number"
                  value={createVehiculo.anio}
                  onChange={(e) =>
                    setCreateVehiculo((f) => ({ ...f, anio: e.target.value }))
                  }
                  placeholder="2022"
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Input
                  value={createVehiculo.color}
                  onChange={(e) =>
                    setCreateVehiculo((f) => ({ ...f, color: e.target.value }))
                  }
                  placeholder="Blanco"
                  className="bg-white/5 border-white/10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>VIN</Label>
              <Input
                value={createVehiculo.vin}
                onChange={(e) =>
                  setCreateVehiculo((f) => ({ ...f, vin: e.target.value }))
                }
                placeholder="Opcional"
                className="bg-white/5 border-white/10"
              />
            </div>

            <div className="pt-2 border-t border-white/10 space-y-3">
              <p className="text-xs font-medium text-emerald-400 uppercase tracking-wide">
                Dueño
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={modoCliente === "existente" ? "default" : "outline"}
                  onClick={() => setModoCliente("existente")}
                  className={
                    modoCliente === "existente"
                      ? "bg-emerald-600 hover:bg-emerald-500"
                      : "border-white/10 text-white/70"
                  }
                >
                  Cliente existente
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={modoCliente === "nuevo" ? "default" : "outline"}
                  onClick={() => setModoCliente("nuevo")}
                  className={
                    modoCliente === "nuevo"
                      ? "bg-emerald-600 hover:bg-emerald-500"
                      : "border-white/10 text-white/70"
                  }
                >
                  Cliente nuevo
                </Button>
              </div>

              {modoCliente === "existente" ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
                    />
                    <Input
                      value={busquedaCliente}
                      onChange={(e) => setBusquedaCliente(e.target.value)}
                      placeholder="Buscar por nombre, DNI, teléfono..."
                      className="pl-9 bg-white/5 border-white/10"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-white/10 p-1">
                    {clientesFiltrados.length === 0 ? (
                      <p className="text-xs text-white/40 p-2 text-center">
                        No se encontraron clientes
                      </p>
                    ) : (
                      clientesFiltrados.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setClienteIdSeleccionado(c.id)}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                            clienteIdSeleccionado === c.id
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "hover:bg-white/5 text-white/80"
                          }`}
                        >
                          <span className="font-medium">{c.nombre}</span>
                          {c.dniRuc && (
                            <span className="text-white/40 ml-2 text-xs">
                              {c.dniRuc}
                            </span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>
                      Nombre <span className="text-rose-400">*</span>
                    </Label>
                    <Input
                      value={createCliente.nombre}
                      onChange={(e) =>
                        setCreateCliente((f) => ({
                          ...f,
                          nombre: e.target.value,
                        }))
                      }
                      placeholder="Juan Pérez"
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>DNI / RUC</Label>
                      <Input
                        value={createCliente.dniRuc}
                        onChange={(e) =>
                          setCreateCliente((f) => ({
                            ...f,
                            dniRuc: e.target.value,
                          }))
                        }
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>WhatsApp</Label>
                      <Input
                        value={createCliente.whatsapp}
                        onChange={(e) =>
                          setCreateCliente((f) => ({
                            ...f,
                            whatsapp: e.target.value,
                          }))
                        }
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Correo</Label>
                    <Input
                      type="email"
                      value={createCliente.correo}
                      onChange={(e) =>
                        setCreateCliente((f) => ({
                          ...f,
                          correo: e.target.value,
                        }))
                      }
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                </div>
              )}
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
              className="border-white/10 text-white/70"
            >
              Cancelar
            </Button>
            <Button
              onClick={guardarNuevo}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              {saving ? "Registrando..." : "Registrar vehículo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL ELIMINAR */}
      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar vehículo</DialogTitle>
            <DialogDescription className="text-white/50">
              ¿Seguro que deseas eliminar el vehículo{" "}
              <span className="text-emerald-400 font-medium">
                {seleccionado?.placa}
              </span>
              ? Solo se puede si no tiene órdenes asociadas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpenDelete(false)}
              disabled={saving}
              className="border-white/10 text-white/70"
            >
              Cancelar
            </Button>
            <Button
              onClick={eliminar}
              disabled={saving}
              className="bg-rose-600 hover:bg-rose-500"
            >
              {saving ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
