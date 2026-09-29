import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { crearOrdenDesdeLaia, type LaiaPayload } from "@/lib/laia-orders";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-webhook-secret");
  if (secret !== process.env.LAIA_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expected = process.env.LAIA_WEBHOOK_SECRET;

  // DEBUG — borrar después
  console.log("secret recibido:", JSON.stringify(secret));
  console.log("secret esperado:", JSON.stringify(expected));
  console.log("iguales?", secret === expected);

  if (!expected || secret !== expected) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        hint: !expected
          ? "LAIA_WEBHOOK_SECRET no está definida en el server"
          : "Header no coincide",
      },
      { status: 401 },
    );
  }

  let body: LaiaPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const result = await crearOrdenDesdeLaia(db, body);

    return NextResponse.json({
      ok: true,
      ...result,
      mensaje: `Orden ${result.numeroOT} registrada`,
    });
  } catch (err: any) {
    console.error("laia webhook:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Error al crear orden" },
      { status: 400 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "laia-webhook",
    path: "/api/laia/webhook",
  });
}
