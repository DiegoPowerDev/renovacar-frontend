"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const error = useAuthStore((s) => s.error);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await login(email, password);
      router.replace("/");
    } catch {
      // error en store
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen  w-screen flex items-center justify-center bg-black text-white p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6"
      >
        <div>
          <h1 className="text-xl font-semibold">Renova Car</h1>
          <p className="text-sm text-white/50">Inicia sesión</p>
        </div>

        <div className="space-y-2">
          <Label>Correo</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-white/5 border-white/10"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Contraseña</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-white/5 border-white/10"
            required
          />
        </div>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <Button
          type="submit"
          disabled={saving}
          className="w-full bg-emerald-600 hover:bg-emerald-500"
        >
          {saving ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </div>
  );
}
