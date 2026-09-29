import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = getAdminDb();
    // lectura simple
    const snap = await db.collection("clientes").limit(1).get();

    return NextResponse.json({
      ok: true,
      project: process.env.FIREBASE_PROJECT_ID,
      clientesSample: snap.size,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Error Admin SDK" },
      { status: 500 },
    );
  }
}
