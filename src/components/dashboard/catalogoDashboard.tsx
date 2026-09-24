"use client";

import { cotizacionesApi } from "@/lib/api";
import { useEffect, useState, useMemo } from "react";
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
  Wrench,
  FileText,
  Banknote,
  Package,
  Plus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { ItemCatalogo } from "@/types/types";

type ServicioForm = {
  nombre: string;
  descripcion: string;
  precioBase: string;
};

const formVacio: ServicioForm = {
  nombre: "",
  descripcion: "",
  precioBase: "",
};

const formatoPrecio = (n: number) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(n ?? 0);

// ======================
// CARD
// ======================
interface CardProps {
  data: ItemCatalogo;
  onClick: (item: ItemCatalogo) => void;
}

const CatalogoCard = ({ data, onClick }: CardProps) => {
  const { nombre, descripcion, precioBase } = data;

  return (
    <button
      type="button"
      onClick={() => onClick(data)}
      className="group relative flex flex-col gap-4 p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-emerald-500/40 transition-all duration-200 text-left w-full"
    >
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
          <Wrench size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-white leading-tight line-clamp-2">
            {nombre}
          </h3>
          <p className="text-xs text-white/50 mt-1">Servicio</p>
        </div>
      </div>

      <div className="flex items-start gap-2.5 text-sm text-white/60 min-h-[40px]">
        <FileText size={15} className="shrink-0 text-white/40 mt-0.5" />
        <span className="line-clamp-2 leading-relaxed">
          {descripcion || "Sin descripción"}
        </span>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-white/10">
        <div className="flex items-center gap-2 text-white/50 text-xs">
          <Banknote size={14} />
          <span>Precio base</span>
        </div>
        <span className="font-semibold text-emerald-400 text-base">
          {formatoPrecio(precioBase ?? 0)}
        </span>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-200 rounded-b-2xl" />
    </button>
  );
};

// ======================
// DASHBOARD
// ======================
export default function CatalogoDashboard() {
  const [search, setSearch] = useState("");
  const [data, setData] = useState<ItemCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Detalle / editar
  const [openDetail, setOpenDetail] = useState(false);
  const [seleccionado, setSeleccionado] = useState<ItemCatalogo | null>(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [form, setForm] = useState<ServicioForm>(formVacio);
  const [formError, setFormError] = useState("");

  // Crear
  const [openCreate, setOpenCreate] = useState(false);
  const [createForm, setCreateForm] = useState<ServicioForm>(formVacio);
  const [createError, setCreateError] = useState("");

  // Eliminar
  const [openDelete, setOpenDelete] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await cotizacionesApi.traerServicios();
      setData(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Error al cargar servicios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const dataFiltrada = useMemo(() => {
    if (!search.trim()) return data;
    const term = search.toLowerCase().trim();
    return data.filter((c) => {
      return (
        c.nombre?.toLowerCase().includes(term) ||
        c.descripcion?.toLowerCase().includes(term) ||
        c.precioBase?.toString().includes(term)
      );
    });
  }, [data, search]);

  const hayCambios = useMemo(() => {
    if (!seleccionado) return false;
    const precioActual = Number(form.precioBase) || 0;
    return (
      form.nombre.trim() !== (seleccionado.nombre || "") ||
      form.descripcion.trim() !== (seleccionado.descripcion || "") ||
      precioActual !== (seleccionado.precioBase ?? 0)
    );
  }, [form, seleccionado]);

  // ----- Detalle -----
  const abrirDetalle = (item: ItemCatalogo) => {
    setSeleccionado(item);
    setForm({
      nombre: item.nombre || "",
      descripcion: item.descripcion || "",
      precioBase: item.precioBase?.toString() ?? "0",
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
      descripcion: seleccionado.descripcion || "",
      precioBase: seleccionado.precioBase?.toString() ?? "0",
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
    const precio = Number(form.precioBase);
    if (isNaN(precio) || precio < 0) {
      setFormError("El precio debe ser un número válido (0 o mayor)");
      return;
    }

    try {
      setSaving(true);
      setFormError("");
      const actualizado = await cotizacionesApi.actualizarServicio(
        seleccionado.id,
        {
          nombre: form.nombre.trim(),
          descripcion: form.descripcion.trim() || undefined,
          precioBase: precio,
        },
      );
      setSeleccionado(actualizado);
      setModoEdicion(false);
      await loadData();
    } catch (err: any) {
      setFormError(
        err?.response?.data?.message || "Error al guardar los cambios",
      );
    } finally {
      setSaving(false);
    }
  };

  // ----- Crear -----
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
    const precio = Number(createForm.precioBase);
    if (isNaN(precio) || precio < 0) {
      setCreateError("El precio debe ser un número válido (0 o mayor)");
      return;
    }

    try {
      setSaving(true);
      setCreateError("");
      await cotizacionesApi.crearServicio({
        nombre: createForm.nombre.trim(),
        descripcion: createForm.descripcion.trim() || undefined,
        precioBase: precio,
      });
      setOpenCreate(false);
      await loadData();
    } catch (err: any) {
      setCreateError(
        err?.response?.data?.message || "Error al crear el servicio",
      );
    } finally {
      setSaving(false);
    }
  };

  // ----- Eliminar (soft delete) -----
  const eliminar = async () => {
    if (!seleccionado) return;
    try {
      setSaving(true);
      await cotizacionesApi.eliminarServicio(seleccionado.id);
      setOpenDelete(false);
      setOpenDetail(false);
      setSeleccionado(null);
      await loadData();
    } catch (err: any) {
      setFormError(
        err?.response?.data?.message || "No se pudo eliminar el servicio",
      );
      setOpenDelete(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400">
            <Package size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">
              Catálogo de servicios
            </h1>
            <p className="text-sm text-white/50">
              {loading
                ? "Cargando..."
                : `${dataFiltrada.length} de ${data.length} servicios`}
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
              placeholder="Buscar servicio o precio..."
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
              <p className="text-sm text-white/50">Cargando servicios...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        ) : dataFiltrada.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3 text-center">
              <Package size={32} className="text-white/20" />
              <p className="text-white/50 text-sm">
                {search
                  ? "No se encontraron servicios con ese criterio"
                  : "No hay servicios registrados"}
              </p>
              {!search && (
                <Button
                  onClick={abrirCrear}
                  variant="outline"
                  className="border-white/10 text-white/70"
                >
                  <Plus size={14} className="mr-1.5" />
                  Crear primer servicio
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {dataFiltrada.map((item) => (
              <CatalogoCard key={item.id} data={item} onClick={abrirDetalle} />
            ))}
          </div>
        )}
      </div>

      {/* ====================== */}
      {/* MODAL DETALLE / EDITAR */}
      {/* ====================== */}
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
              {modoEdicion ? "Editar servicio" : "Detalle del servicio"}
            </DialogTitle>
            <DialogDescription className="text-white/50">
              {modoEdicion
                ? "Modifica los campos y guarda los cambios"
                : "Información del servicio en el catálogo"}
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
              <Label>Descripción</Label>
              <Input
                value={form.descripcion}
                disabled={!modoEdicion}
                onChange={(e) =>
                  setForm((f) => ({ ...f, descripcion: e.target.value }))
                }
                className="bg-white/5 border-white/10 disabled:opacity-60"
              />
            </div>

            <div className="space-y-2">
              <Label>Precio base (S/)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.precioBase}
                disabled={!modoEdicion}
                onChange={(e) =>
                  setForm((f) => ({ ...f, precioBase: e.target.value }))
                }
                className="bg-white/5 border-white/10 disabled:opacity-60"
              />
            </div>

            {!modoEdicion && seleccionado && (
              <p className="text-sm text-emerald-400 font-medium">
                {formatoPrecio(seleccionado.precioBase ?? 0)}
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

      {/* ====================== */}
      {/* MODAL CREAR            */}
      {/* ====================== */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo servicio</DialogTitle>
            <DialogDescription className="text-white/50">
              Agrega un servicio al catálogo
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
                placeholder="Pintura de puerta"
                className="bg-white/5 border-white/10"
              />
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input
                value={createForm.descripcion}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, descripcion: e.target.value }))
                }
                placeholder="Pintura completa de una puerta"
                className="bg-white/5 border-white/10"
              />
            </div>

            <div className="space-y-2">
              <Label>
                Precio base (S/) <span className="text-rose-400">*</span>
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={createForm.precioBase}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, precioBase: e.target.value }))
                }
                placeholder="250.00"
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
              className="border-white/10 text-white/70"
            >
              Cancelar
            </Button>
            <Button
              onClick={guardarNuevo}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              {saving ? "Creando..." : "Crear servicio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ====================== */}
      {/* MODAL ELIMINAR         */}
      {/* ====================== */}
      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar servicio</DialogTitle>
            <DialogDescription className="text-white/50">
              ¿Seguro que deseas eliminar{" "}
              <span className="text-white font-medium">
                {seleccionado?.nombre}
              </span>
              ? Se desactivará del catálogo (soft delete).
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
