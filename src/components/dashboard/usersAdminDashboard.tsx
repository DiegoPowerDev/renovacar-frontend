// components/dashboard/UsersAdminDashboard.tsx
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

export default function UsersAdminDashboard() {
  const can = useAuthStore((s) => s.can);
  const currentUid = useAuthStore((s) => s.user?.uid);
  const { users, loading, error, fetchUsers, updateUser } =
    useUsersAdminStore();

  const [search, setSearch] = useState("");
  const [openEdit, setOpenEdit] = useState(false);
  const [selected, setSelected] = useState<AppUser | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editRoles, setEditRoles] = useState<AppRole[]>([]);
  const [editActivo, setEditActivo] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

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

  const guardar = async () => {
    if (!selected) return;
    if (editRoles.length === 0) {
      setFormError("Asigna al menos un rol");
      return;
    }
    // no quitar admin a ti mismo
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

        <div className="relative w-full sm:w-64">
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
      </div>

      <p className="text-xs text-white/40">
        Los usuarios se crean en Firebase Authentication. Aquí solo asignas
        roles y activas/desactivas el acceso a la app.
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
          <p className="text-white/50 text-sm text-center py-12">
            No hay usuarios. Crea uno en Firebase Auth e inicia sesión una vez.
          </p>
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
        <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-md">
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
              <div className="space-y-2">
                {ALL_ROLES.map((r) => {
                  const checked = editRoles.includes(r.id);
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
                        onChange={() => toggleRole(r.id)}
                        className="mt-1"
                      />
                      <div>
                        <p className="text-sm font-medium text-white">
                          {r.label}
                        </p>
                        <p className="text-xs text-white/40">{r.desc}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
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

          <DialogFooter>
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
    </div>
  );
}
