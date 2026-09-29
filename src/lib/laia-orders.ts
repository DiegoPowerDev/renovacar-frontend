// lib/laia-orders.ts
import { Firestore, FieldValue, Timestamp } from "firebase-admin/firestore";

export type LaiaPayload = {
  evento?: string;
  cliente?: {
    nombre?: string;
    whatsapp?: string;
    telefono?: string;
    dniRuc?: string;
    correo?: string;
  };
  vehiculo?: {
    placa?: string;
    marca?: string;
    modelo?: string;
    anio?: number;
    color?: string;
    vin?: string;
  };
  items?: Array<{
    nombre: string;
    descripcion?: string;
    cantidad?: number;
    precioUnitario: number;
    descuento?: number;
  }>;
  pago?: {
    monto?: number;
    metodo?: string;
    comprobante?: string;
    observaciones?: string;
  };
  observaciones?: string;
  kilometraje?: number;
};

function normalizarPlaca(placa: string) {
  return placa.toUpperCase().trim();
}

async function generarNumeroOT(db: Firestore): Promise<string> {
  const anio = new Date().getFullYear();
  const ref = db.collection("contadores").doc("ot");

  const numero = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    let seq = 1;

    if (!snap.exists) {
      tx.set(ref, { anio, seq: 1 });
    } else {
      const data = snap.data()!;
      if (data.anio === anio) {
        seq = (Number(data.seq) || 0) + 1;
        tx.update(ref, { seq });
      } else {
        seq = 1;
        tx.set(ref, { anio, seq: 1 });
      }
    }

    return `OT-${anio}-${seq.toString().padStart(6, "0")}`;
  });

  return numero;
}

/** Busca cliente por whatsapp o dni; si no existe, crea */
async function resolveCliente(
  db: Firestore,
  data: NonNullable<LaiaPayload["cliente"]>,
) {
  const nombre = data.nombre?.trim();
  if (!nombre) throw new Error("cliente.nombre es obligatorio");

  const whatsapp = data.whatsapp?.trim() || data.telefono?.trim() || null;
  const dniRuc = data.dniRuc?.trim() || null;

  if (dniRuc) {
    const q = await db
      .collection("clientes")
      .where("dniRuc", "==", dniRuc)
      .limit(1)
      .get();
    if (!q.empty) {
      return { id: q.docs[0].id, ...q.docs[0].data(), creado: false };
    }
  }

  if (whatsapp) {
    const q = await db
      .collection("clientes")
      .where("whatsapp", "==", whatsapp)
      .limit(1)
      .get();
    if (!q.empty) {
      return { id: q.docs[0].id, ...q.docs[0].data(), creado: false };
    }
  }

  const ref = db.collection("clientes").doc();
  const payload = {
    nombre,
    dniRuc,
    telefono: data.telefono?.trim() || null,
    whatsapp,
    correo: data.correo?.trim() || null,
    origen: "laia",
    creadoEn: FieldValue.serverTimestamp(),
    actualizadoEn: FieldValue.serverTimestamp(),
  };
  await ref.set(payload);

  return { id: ref.id, ...payload, creado: true };
}

/** Placa = id del documento vehículo */
async function resolveVehiculo(
  db: Firestore,
  data: NonNullable<LaiaPayload["vehiculo"]>,
  clienteId: string,
  clienteNombre: string,
) {
  const placa = normalizarPlaca(data.placa || "");
  if (!placa) throw new Error("vehiculo.placa es obligatorio");
  if (!data.marca?.trim() || !data.modelo?.trim()) {
    throw new Error("vehiculo.marca y modelo son obligatorios");
  }

  const ref = db.collection("vehiculos").doc(placa);
  const snap = await ref.get();

  if (snap.exists) {
    return { id: placa, ...snap.data(), creado: false };
  }

  const payload = {
    placa,
    marca: data.marca.trim(),
    modelo: data.modelo.trim(),
    anio: data.anio ?? null,
    color: data.color?.trim() || null,
    vin: data.vin?.trim() || null,
    clienteId,
    clienteNombre,
    origen: "laia",
    creadoEn: FieldValue.serverTimestamp(),
    actualizadoEn: FieldValue.serverTimestamp(),
  };
  await ref.set(payload);

  return { id: placa, ...payload, creado: true };
}

export async function crearOrdenDesdeLaia(db: Firestore, body: LaiaPayload) {
  if (!body.cliente) throw new Error("Falta cliente");
  if (!body.vehiculo) throw new Error("Falta vehiculo");

  const cliente = await resolveCliente(db, body.cliente);
  const vehiculo = await resolveVehiculo(
    db,
    body.vehiculo,
    cliente.id,
    (cliente as any).nombre || body.cliente.nombre!,
  );

  const items = body.items || [];
  let subtotal = 0;
  let descuentoTotal = 0;

  const itemsMapped = items.map((it) => {
    const cantidad = it.cantidad ?? 1;
    const descuento = it.descuento ?? 0;
    const line = cantidad * it.precioUnitario - descuento;
    subtotal += cantidad * it.precioUnitario;
    descuentoTotal += descuento;
    return {
      nombre: it.nombre,
      descripcion: it.descripcion || null,
      cantidad,
      precioUnitario: it.precioUnitario,
      descuento,
      subtotal: Math.max(line, 0),
      creadoEn: Timestamp.now(),
    };
  });

  const total = Math.max(subtotal - descuentoTotal, 0);
  const montoPago = body.pago?.monto ?? 0;
  const totalPagado = montoPago > 0 ? montoPago : 0;
  const saldoPendiente = Math.max(total - totalPagado, 0);

  const numero = await generarNumeroOT(db);
  const ordenRef = db.collection("ordenes").doc(numero);

  await ordenRef.set({
    numero,
    placa: vehiculo.id,
    vehiculoId: vehiculo.id,
    clienteId: cliente.id,
    clienteNombre: (cliente as any).nombre || body.cliente.nombre,
    marca: body.vehiculo.marca?.trim() || null,
    modelo: body.vehiculo.modelo?.trim() || null,
    fechaIngreso: FieldValue.serverTimestamp(),
    fechaPrometida: null,
    estado: totalPagado > 0 ? "EN_PROCESO" : "COTIZADA",
    observaciones: body.observaciones?.trim() || null,
    kilometraje: body.kilometraje ?? null,
    nivelCombustible: null,
    estadoCotizacion: "ACEPTADA",
    subtotal,
    descuentoTotal,
    total,
    totalPagado,
    saldoPendiente,
    controlCalidad: null,
    entrega: null,
    origen: "laia",
    creadoEn: FieldValue.serverTimestamp(),
    actualizadoEn: FieldValue.serverTimestamp(),
  });

  const batch = db.batch();
  for (const item of itemsMapped) {
    const itemRef = ordenRef.collection("items").doc();
    batch.set(itemRef, item);
  }

  if (montoPago > 0 && body.pago) {
    const pagoRef = ordenRef.collection("pagos").doc();
    batch.set(pagoRef, {
      monto: montoPago,
      metodo: (body.pago.metodo || "OTRO").toUpperCase(),
      comprobante: body.pago.comprobante || null,
      observaciones: body.pago.observaciones || null,
      registradoPor: "laia",
      fecha: Timestamp.now(),
      creadoEn: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();

  return {
    numeroOT: numero,
    clienteId: cliente.id,
    clienteNuevo: !!(cliente as any).creado,
    placa: vehiculo.id,
    vehiculoNuevo: !!(vehiculo as any).creado,
    total,
    totalPagado,
    saldoPendiente,
  };
}
