import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase-admin";

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
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> },
) {
  try {
    await assertAdmin(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const secret = req.headers.get("x-admin-secret");
    if (secret !== process.env.ADMIN_API_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { uid } = await params;
    if (!uid) {
      return NextResponse.json({ error: "uid requerido" }, { status: 400 });
    }

    getAdminApp();
    const auth = getAuth();
    const db = getFirestore();

    // Auth
    try {
      await auth.deleteUser(uid);
    } catch (err: any) {
      if (err?.code !== "auth/user-not-found") throw err;
    }

    // Firestore
    await db.collection("usuarios").doc(uid).delete();

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Error al eliminar" },
      { status: 400 },
    );
  }
}
