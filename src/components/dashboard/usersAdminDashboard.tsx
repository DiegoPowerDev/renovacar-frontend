"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUsersAdminStore } from "@/stores/useUsersAdminStore";
import type { AppRole, AppUser } from "@/types/auth";
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
  Shield,
  UserCog,
  Mail,
  Pencil,
  Ban,
  CheckCircle2,
  Plus,
  Trash2,
} from "lucide-react";

const ALL_ROLES: { id: AppRole; label: string; desc: string }[] = [
  { id: "admin", label: "Admin", desc: "Acceso total" },
  { id: "comercial", label: "Comercial", desc: "Clientes, OT, cotización" },
  { id: "taller", label: "Taller", desc: "Producción / etapas" },
  { id: "calidad", label: "Calidad", desc: "QC y entrega" },
  { id: "finanzas", label: "Finanzas", desc: "Pagos y saldos" },
  { id: "viewer", label: "Viewer", desc: "Solo lectura" },
];

function RoleBadges({ roles }: { roles: AppRole[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {roles.map((r) => (
        <span
          key={r}
          className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
        >
          {r}
        </span>
      ))}
    </div>
  );
}

function RolesChecklist({
  value,
  onToggle,
}: {
  value: AppRole[];
  onToggle: (role: AppRole) => void;
}) {
  return (
    <div className="space-y-2 grid grid-cols-2 gap-2">
      {ALL_ROLES.map((r) => {
        const checked = value.includes(r.id);
        return (
          <label
            key={r.id}
            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
              checked
                ? "border-emerald-500/40 bg-emerald-500/10"
                : "border-white/10 bg-white/5 hover:bg-white/10"
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggle(r.id)}
              className="mt-1"
            />
            <div>
              <p className="text-sm font-medium text-white">{r.label}</p>
              <p className="text-xs text-white/40">{r.desc}</p>
            </div>
          </label>
        );
      })}
    </div>
  );
}

export default function UsersAdminDashboard() {
  const can = useAuthStore((s) => s.can);
  const currentUid = useAuthStore((s) => s.user?.uid);

  const {
    users,
    loading,
    error,
    fetchUsers,
    updateUser,
    createUser,
    deleteUser,
  } = useUsersAdminStore();

  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  // Editar
  const [openEdit, setOpenEdit] = useState(false);
  const [selected, setSelected] = useState<AppUser | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editRoles, setEditRoles] = useState<AppRole[]>([]);
  const [editActivo, setEditActivo] = useState(true);
  const [formError, setFormError] = useState("");

  // Crear
  const [openCreate, setOpenCreate] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createNombre, setCreateNombre] = useState("");
  const [createRoles, setCreateRoles] = useState<AppRole[]>(["viewer"]);
  const [createError, setCreateError] = useState("");

  // Eliminar
  const [openDelete, setOpenDelete] = useState(false);

  useEffect(() => {
    if (can("users.manage")) fetchUsers();
  }, [can, fetchUsers]);

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const t = search.toLowerCase().trim();
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(t) ||
        u.nombre.toLowerCase().includes(t) ||
        u.roles.some((r) => r.includes(t)),
    );
  }, [users, search]);

  const abrirEdit = (u: AppUser) => {
    setSelected(u);
    setEditNombre(u.nombre);
    setEditRoles([...u.roles]);
    setEditActivo(u.activo);
    setFormError("");
    setOpenEdit(true);
  };

  const toggleRole = (role: AppRole) => {
    setEditRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const toggleCreateRole = (role: AppRole) => {
    setCreateRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const abrirCrear = () => {
    setCreateEmail("");
    setCreatePassword("");
    setCreateNombre("");
    setCreateRoles(["viewer"]);
    setCreateError("");
    setOpenCreate(true);
  };

  const guardar = async () => {
    if (!selected) return;
    if (editRoles.length === 0) {
      setFormError("Asigna al menos un rol");
      return;
    }
    if (
      selected.uid === currentUid &&
      !editRoles.includes("admin") &&
      selected.roles.includes("admin")
    ) {
      setFormError("No puedes quitarte el rol admin a ti mismo");
      return;
    }
    try {
      setSaving(true);
      setFormError("");
      await updateUser(selected.uid, {
        nombre: editNombre.trim() || selected.email,
        roles: editRoles,
        activo: editActivo,
      });
      setOpenEdit(false);
    } catch (err: any) {
      setFormError(err?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const guardarNuevo = async () => {
    if (!createEmail.trim() || !createPassword) {
      setCreateError("Email y contraseña obligatorios");
      return;
    }
    if (createPassword.length < 6) {
      setCreateError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (createRoles.length === 0) {
      setCreateError("Asigna al menos un rol");
      return;
    }
    try {
      setSaving(true);
      setCreateError("");
      await createUser({
        email: createEmail.trim(),
        password: createPassword,
        nombre: createNombre.trim() || createEmail.split("@")[0],
        roles: createRoles,
        activo: true,
      });
      setOpenCreate(false);
    } catch (err: any) {
      setCreateError(err?.message || "Error al crear");
    } finally {
      setSaving(false);
    }
  };

  const confirmarEliminar = async () => {
    if (!selected) return;
    if (selected.uid === currentUid) {
      setFormError("No puedes eliminarte a ti mismo");
      setOpenDelete(false);
      return;
    }
    try {
      setSaving(true);
      await deleteUser(selected.uid);
      setOpenDelete(false);
      setOpenEdit(false);
      setSelected(null);
    } catch (err: any) {
      setFormError(err?.message || "Error al eliminar");
      setOpenDelete(false);
    } finally {
      setSaving(false);
    }
  };

  if (!can("users.manage")) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-white/50 text-sm">
          No tienes permiso para gestionar usuarios.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400">
            <Shield size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Usuarios</h1>
            <p className="text-sm text-white/50">
              {loading ? "Cargando..." : `${filtered.length} usuarios`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
            />
            <Input
              className="pl-9 bg-white/5 border-white/10 placeholder:text-white/30"
              placeholder="Buscar email, nombre, rol..."
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

      <p className="text-xs text-white/40">
        Crea usuarios desde aquí (Authentication + perfil en Firestore). Edita
        roles, activa/desactiva o elimina el acceso.
      </p>

      {/* Lista */}
      <div className="flex-1">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <p className="text-rose-400 text-sm text-center py-12">{error}</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <p className="text-white/50 text-sm text-center">
              {search
                ? "No se encontraron usuarios"
                : "No hay usuarios registrados"}
            </p>
            {!search && (
              <Button
                onClick={abrirCrear}
                variant="outline"
                className="border-white/10 text-white/70"
              >
                <Plus size={14} className="mr-1.5" />
                Crear primer usuario
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((u) => (
              <button
                key={u.uid}
                type="button"
                onClick={() => abrirEdit(u)}
                className="text-left group flex flex-col gap-3 p-5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-emerald-500/40 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <UserCog size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate">
                        {u.nombre || "Sin nombre"}
                      </p>
                      <p className="text-xs text-white/40 flex items-center gap-1 truncate">
                        <Mail size={12} />
                        {u.email}
                      </p>
                    </div>
                  </div>
                  {u.activo ? (
                    <CheckCircle2
                      size={16}
                      className="text-emerald-400 shrink-0"
                    />
                  ) : (
                    <Ban size={16} className="text-rose-400 shrink-0" />
                  )}
                </div>

                <RoleBadges roles={u.roles} />

                <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs text-white/40">
                  <span>{u.activo ? "Activo" : "Desactivado"}</span>
                  <span className="flex items-center gap-1 text-emerald-400/80 group-hover:text-emerald-400">
                    <Pencil size={12} />
                    Editar
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal editar */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
            <DialogDescription className="text-white/50">
              {selected?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={editNombre}
                onChange={(e) => setEditNombre(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>

            <div className="space-y-2">
              <Label>Roles</Label>
              <RolesChecklist value={editRoles} onToggle={toggleRole} />
            </div>

            <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
              <input
                type="checkbox"
                checked={editActivo}
                onChange={(e) => setEditActivo(e.target.checked)}
              />
              Usuario activo (puede entrar a la app)
            </label>

            {formError && <p className="text-sm text-rose-400">{formError}</p>}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setOpenDelete(true)}
              disabled={saving || selected?.uid === currentUid}
              className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 sm:mr-auto"
            >
              <Trash2 size={14} className="mr-1.5" />
              Eliminar
            </Button>
            <Button
              variant="outline"
              onClick={() => setOpenEdit(false)}
              disabled={saving}
              className="border-white/10 text-white/70"
            >
              Cancelar
            </Button>
            <Button
              onClick={guardar}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal crear */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo usuario</DialogTitle>
            <DialogDescription className="text-white/50">
              Se crea en Authentication y en Firestore
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={createNombre}
                onChange={(e) => setCreateNombre(e.target.value)}
                placeholder="Juan Pérez"
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>
                Email <span className="text-rose-400">*</span>
              </Label>
              <Input
                type="email"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                placeholder="usuario@renova.com"
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>
                Contraseña <span className="text-rose-400">*</span>
              </Label>
              <Input
                type="password"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>Roles</Label>
              <RolesChecklist value={createRoles} onToggle={toggleCreateRole} />
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
              {saving ? "Creando..." : "Crear usuario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal eliminar */}
      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar usuario</DialogTitle>
            <DialogDescription className="text-white/50">
              ¿Eliminar a{" "}
              <span className="text-white font-medium">{selected?.email}</span>?
              Se borra de Authentication y de Firestore. No se puede deshacer.
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
              onClick={confirmarEliminar}
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
