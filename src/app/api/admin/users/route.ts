import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase-admin"; // el que ya usas en el webhook

export const runtime = "nodejs";
async function assertAdmin(req: NextRequest) {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new Error("Unauthorized");

  getAdminApp();
  const decoded = await getAuth().verifyIdToken(token);
  const snap = await getFirestore().doc(`usuarios/${decoded.uid}`).get();
  const roles: string[] = snap.data()?.roles || [];
  if (!roles.includes("admin")) throw new Error("Forbidden");

  return decoded.uid;
}
export async function POST(req: NextRequest) {
  try {
    await assertAdmin(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    // Seguridad simple: header con secret de admin (o verifica ID token después)
    const secret = req.headers.get("x-admin-secret");
    if (secret !== process.env.ADMIN_API_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const password = String(body.password || "");
    const nombre = String(body.nombre || "").trim() || email.split("@")[0];
    const roles: string[] = Array.isArray(body.roles) ? body.roles : ["viewer"];
    const activo = body.activo !== false;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son obligatorios" },
        { status: 400 },
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 },
      );
    }

    getAdminApp();
    const auth = getAuth();
    const db = getFirestore();

    const userRecord = await auth.createUser({
      email,
      password,
      displayName: nombre,
      emailVerified: false,
      disabled: !activo,
    });

    await db.collection("usuarios").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      nombre,
      roles,
      activo,
      creadoEn: new Date(),
      actualizadoEn: new Date(),
    });

    return NextResponse.json({
      uid: userRecord.uid,
      email,
      nombre,
      roles,
      activo,
    });
  } catch (err: any) {
    const msg =
      err?.code === "auth/email-already-exists"
        ? "Ya existe un usuario con ese correo"
        : err?.message || "Error al crear usuario";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
