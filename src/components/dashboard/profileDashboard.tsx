// components/dashboard/profileDashboard.tsx
"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase/config";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { User, Shield, Mail } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProfileDashboard() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  // Si tienes un setProfile en el store, úsalo; si no, recarga con init

  const [nombre, setNombre] = useState(profile?.nombre || "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  if (!profile || !user) {
    return (
      <div className="flex-1 flex items-center justify-center text-white/50 text-sm">
        Cargando perfil...
      </div>
    );
  }

  const guardar = async () => {
    if (!nombre.trim()) {
      setError("El nombre no puede estar vacío");
      return;
    }
    try {
      setSaving(true);
      setError("");
      setMsg("");
      await updateDoc(doc(db, "usuarios", user.uid), {
        nombre: nombre.trim(),
        actualizadoEn: serverTimestamp(),
      });
      // Actualizar store local si tienes método; si no:
      useAuthStore.setState({
        profile: { ...profile, nombre: nombre.trim() },
      });
      setMsg("Perfil actualizado");
    } catch (err: any) {
      setError(err?.message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <div className="flex-1 w-full flex flex-col gap-6 p-6 max-w-lg">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400">
          <User size={20} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">Mi perfil</h1>
          <p className="text-sm text-white/50">Datos de tu cuenta</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
        <div className="space-y-2">
          <Label>Nombre</Label>
          <Input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="bg-white/5 border-white/10"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Mail size={14} /> Correo
          </Label>
          <Input
            value={profile.email}
            disabled
            className="bg-white/5 border-white/10 opacity-60"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Shield size={14} /> Roles
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {profile.roles.map((r) => (
              <span
                key={r}
                className="text-xs px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
              >
                {r}
              </span>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-rose-400">{error}</p>}
        {msg && <p className="text-sm text-emerald-400">{msg}</p>}

        <Button
          onClick={guardar}
          disabled={saving || nombre.trim() === (profile.nombre || "")}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40"
        >
          {saving ? "Guardando..." : "Guardar nombre"}
        </Button>
      </div>

      <Button
        variant="outline"
        onClick={handleLogout}
        className="border-rose-500 text-rose-400 w-fit"
      >
        Cerrar sesión
      </Button>
    </div>
  );
}
