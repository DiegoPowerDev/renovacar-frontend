"use client";

import { useEffect, useState, useMemo } from "react";
import { useClientesStore, type Cliente } from "@/stores/useClientesStore"; // ajusta la ruta
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
  User,
  Phone,
  IdCard,
  Calendar,
  Users,
  Plus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { formatDate } from "date-fns";

type ClienteForm = {
  nombre: string;
  dniRuc: string;
  telefono: string;
  whatsapp: string;
  correo: string;
};

const formVacio: ClienteForm = {
  nombre: "",
  dniRuc: "",
  telefono: "",
  whatsapp: "",
  correo: "",
};

// ======================
// CARD
// ======================
interface CardProps {
  data: Cliente;
  onClick: (cliente: Cliente) => void;
}

const ClientCard = ({ data, onClick }: CardProps) => {
  const { nombre, dniRuc, whatsapp, telefono, creadoEn } = data;

  const iniciales = nombre
    ?.split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <button
      type="button"
      onClick={() => onClick(data)}
      className="group relative flex flex-col gap-4 p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-emerald-500/40 transition-all duration-200 text-left w-full"
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-11 h-11 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold text-sm shrink-0">
          {iniciales || <User size={18} />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-white truncate leading-tight">
            {nombre}
          </h3>
          <p className="text-xs text-white/50 mt-0.5">Cliente</p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 text-sm">
        <div className="flex items-center gap-2.5 bg-white/70">
          <IdCard size={15} className="shrink-0 text-white/40" />
          <span className="truncate">{dniRuc || "Sin documento"}</span>
        </div>
        <div className="flex items-center gap-2.5 text-white/70">
          <Phone size={15} className="shrink-0 text-white/40" />
          <span className="truncate">
            {whatsapp || telefono || "Sin teléfono"}
          </span>
        </div>
        <div className="flex items-center gap-2.5 text-white/70">
          <Calendar size={15} className="shrink-0 text-white/40" />
          <span className="truncate">
            {creadoEn
              ? formatDate(
                  creadoEn instanceof Date ? creadoEn : new Date(creadoEn),
                  "dd MMM yyyy",
                )
              : "—"}
          </span>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-200 rounded-b-2xl" />
    </button>
  );
};

// ======================
// DASHBOARD
// ======================
export default function ClientsDashboard() {
  const {
    clientes,
    loading,
    error: storeError,
    create,
    update,
    remove,
  } = useClientesStore();

  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const [openDetail, setOpenDetail] = useState(false);
  const [seleccionado, setSeleccionado] = useState<Cliente | null>(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [form, setForm] = useState<ClienteForm>(formVacio);
  const [formError, setFormError] = useState("");

  const [openCreate, setOpenCreate] = useState(false);
  const [createForm, setCreateForm] = useState<ClienteForm>(formVacio);
  const [createError, setCreateError] = useState("");

  const [openDelete, setOpenDelete] = useState(false);

  const dataFiltrada = useMemo(() => {
    if (!search.trim()) return clientes;
    const term = search.toLowerCase().trim();
    return clientes.filter((c) => {
      return (
        c.nombre?.toLowerCase().includes(term) ||
        c.dniRuc?.toLowerCase().includes(term) ||
        c.telefono?.toLowerCase().includes(term) ||
        c.whatsapp?.toLowerCase().includes(term) ||
        c.correo?.toLowerCase().includes(term)
      );
    });
  }, [clientes, search]);

  const hayCambios = useMemo(() => {
    if (!seleccionado) return false;
    return (
      form.nombre.trim() !== (seleccionado.nombre || "") ||
      form.dniRuc.trim() !== (seleccionado.dniRuc || "") ||
      form.telefono.trim() !== (seleccionado.telefono || "") ||
      form.whatsapp.trim() !== (seleccionado.whatsapp || "") ||
      form.correo.trim() !== (seleccionado.correo || "")
    );
  }, [form, seleccionado]);

  const abrirDetalle = (cliente: Cliente) => {
    setSeleccionado(cliente);
    setForm({
      nombre: cliente.nombre || "",
      dniRuc: cliente.dniRuc || "",
      telefono: cliente.telefono || "",
      whatsapp: cliente.whatsapp || "",
      correo: cliente.correo || "",
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
      nombre: seleccionado.nombre || "",
      dniRuc: seleccionado.dniRuc || "",
      telefono: seleccionado.telefono || "",
      whatsapp: seleccionado.whatsapp || "",
      correo: seleccionado.correo || "",
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
    if (!form.nombre.trim()) {
      setFormError("El nombre es obligatorio");
      return;
    }

    try {
      setSaving(true);
      setFormError("");
      const actualizado = await update(seleccionado.id, {
        nombre: form.nombre.trim(),
        dniRuc: form.dniRuc.trim() || undefined,
        telefono: form.telefono.trim() || undefined,
        whatsapp: form.whatsapp.trim() || undefined,
        correo: form.correo.trim() || undefined,
      });
      setSeleccionado(actualizado);
      setModoEdicion(false);
      // onSnapshot actualiza la lista solo
    } catch (err: any) {
      setFormError(err?.message || "Error al guardar los cambios");
    } finally {
      setSaving(false);
    }
  };

  const abrirCrear = () => {
    setCreateForm(formVacio);
    setCreateError("");
    setOpenCreate(true);
  };

  const guardarNuevo = async () => {
    if (!createForm.nombre.trim()) {
      setCreateError("El nombre es obligatorio");
      return;
    }

    try {
      setSaving(true);
      setCreateError("");
      await create({
        nombre: createForm.nombre.trim(),
        dniRuc: createForm.dniRuc.trim() || undefined,
        telefono: createForm.telefono.trim() || undefined,
        whatsapp: createForm.whatsapp.trim() || undefined,
        correo: createForm.correo.trim() || undefined,
      });
      setOpenCreate(false);
    } catch (err: any) {
      setCreateError(err?.message || "Error al crear el cliente");
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
      setFormError(err?.message || "No se pudo eliminar el cliente");
      setOpenDelete(false);
    } finally {
      setSaving(false);
    }
  };

  const error = storeError || "";

  return (
    <div className="flex-1 w-full flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400">
            <Users size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Clientes</h1>
            <p className="text-sm text-white/50">
              {loading
                ? "Cargando..."
                : `${dataFiltrada.length} de ${clientes.length} clientes`}
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
              placeholder="Buscar nombre, DNI, teléfono..."
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
              <p className="text-sm text-white/50">Cargando clientes...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        ) : dataFiltrada.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3 text-center">
              <Users size={32} className="text-white/20" />
              <p className="text-white/50 text-sm">
                {search
                  ? "No se encontraron clientes con ese criterio"
                  : "No hay clientes registrados"}
              </p>
              {!search && (
                <Button
                  onClick={abrirCrear}
                  variant="outline"
                  className="border-white/10 "
                >
                  <Plus size={14} className="mr-1.5" />
                  Crear primer cliente
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {dataFiltrada.map((cliente) => (
              <ClientCard
                key={cliente.id}
                data={cliente}
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
              {modoEdicion ? "Editar cliente" : "Detalle del cliente"}
            </DialogTitle>
            <DialogDescription className="text-white/50">
              {modoEdicion
                ? "Modifica los campos y guarda los cambios"
                : "Información registrada del cliente"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={form.nombre}
                disabled={!modoEdicion}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nombre: e.target.value }))
                }
                className="bg-white/5 border-white/10 disabled:opacity-60"
              />
            </div>
            <div className="space-y-2">
              <Label>DNI / RUC / C.E.</Label>
              <Input
                value={form.dniRuc}
                disabled={!modoEdicion}
                onChange={(e) =>
                  setForm((f) => ({ ...f, dniRuc: e.target.value }))
                }
                className="bg-white/5 border-white/10 disabled:opacity-60"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  value={form.telefono}
                  disabled={!modoEdicion}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, telefono: e.target.value }))
                  }
                  className="bg-white/5 border-white/10 disabled:opacity-60"
                />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input
                  value={form.whatsapp}
                  disabled={!modoEdicion}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, whatsapp: e.target.value }))
                  }
                  className="bg-white/5 border-white/10 disabled:opacity-60"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Correo</Label>
              <Input
                value={form.correo}
                disabled={!modoEdicion}
                onChange={(e) =>
                  setForm((f) => ({ ...f, correo: e.target.value }))
                }
                className="bg-white/5 border-white/10 disabled:opacity-60"
              />
            </div>

            {seleccionado?.creadoEn && !modoEdicion && (
              <p className="text-xs text-white/40">
                Registrado el{" "}
                {formatDate(
                  seleccionado.creadoEn instanceof Date
                    ? seleccionado.creadoEn
                    : new Date(seleccionado.creadoEn),
                  "dd MMM yyyy HH:mm",
                )}
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
                  className="border-white/10 "
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

      {/* MODAL CREAR */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo cliente</DialogTitle>
            <DialogDescription className="text-white/50">
              Completa los datos para registrar un cliente
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="space-y-2">
              <Label>
                Nombre <span className="text-rose-400">*</span>
              </Label>
              <Input
                value={createForm.nombre}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, nombre: e.target.value }))
                }
                placeholder="Juan Pérez García"
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>DNI / RUC / C.E.</Label>
              <Input
                value={createForm.dniRuc}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, dniRuc: e.target.value }))
                }
                placeholder="45678912"
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  value={createForm.telefono}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, telefono: e.target.value }))
                  }
                  placeholder="999888777"
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input
                  value={createForm.whatsapp}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, whatsapp: e.target.value }))
                  }
                  placeholder="999888777"
                  className="bg-white/5 border-white/10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Correo</Label>
              <Input
                type="email"
                value={createForm.correo}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, correo: e.target.value }))
                }
                placeholder="cliente@email.com"
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
              className="border-white/10 "
            >
              Cancelar
            </Button>
            <Button
              onClick={guardarNuevo}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              {saving ? "Creando..." : "Crear cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL ELIMINAR */}
      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar cliente</DialogTitle>
            <DialogDescription className="text-white/50">
              ¿Seguro que deseas eliminar a{" "}
              <span className="text-white font-medium">
                {seleccionado?.nombre}
              </span>
              ? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpenDelete(false)}
              disabled={saving}
              className="border-white/10 "
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
