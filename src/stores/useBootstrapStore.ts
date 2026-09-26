// src/stores/useBootstrapStore.ts
import { create } from "zustand";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { useClientesStore, type Cliente } from "./useClientesStore";
import { useVehiculosStore, type Vehiculo } from "./useVehiculosStore";
import { useCatalogoStore, type ServicioCatalogo } from "./useCatalogoStore";
import { useOrdenesStore, type OrdenTrabajo } from "./useOrdenesStore";

type BootstrapState = {
  ready: boolean;
  loading: boolean;
  error: string | null;
  _unsubs: Unsubscribe[];
  startRealtime: () => void;
  stopRealtime: () => void; // solo al cerrar sesión / salir de la app
};

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return new Date(value as string);
}

function mapCliente(id: string, data: Record<string, unknown>): Cliente {
  return {
    id,
    nombre: (data.nombre as string) || "",
    dniRuc: (data.dniRuc as string) || null,
    telefono: (data.telefono as string) || null,
    whatsapp: (data.whatsapp as string) || null,
    correo: (data.correo as string) || null,
    creadoEn: toDate(data.creadoEn),
    actualizadoEn: toDate(data.actualizadoEn),
  };
}

function mapVehiculo(id: string, data: Record<string, unknown>): Vehiculo {
  return {
    id,
    placa: (data.placa as string) || id,
    marca: (data.marca as string) || "",
    modelo: (data.modelo as string) || "",
    anio: (data.anio as number) ?? null,
    color: (data.color as string) || null,
    vin: (data.vin as string) || null,
    clienteId: (data.clienteId as string) || "",
    clienteNombre: (data.clienteNombre as string) || null,
    creadoEn: toDate(data.creadoEn),
    actualizadoEn: toDate(data.actualizadoEn),
  };
}

function mapServicio(
  id: string,
  data: Record<string, unknown>,
): ServicioCatalogo {
  return {
    id,
    nombre: (data.nombre as string) || "",
    descripcion: (data.descripcion as string) || null,
    precioBase: Number(data.precioBase) || 0,
    activo: data.activo !== false,
    creadoEn: toDate(data.creadoEn),
    actualizadoEn: toDate(data.actualizadoEn),
  };
}

function mapOrden(id: string, data: Record<string, unknown>): OrdenTrabajo {
  return {
    id,
    numero: (data.numero as string) || id,
    placa: (data.placa as string) || "",
    vehiculoId: (data.vehiculoId as string) || "",
    clienteId: (data.clienteId as string) || "",
    clienteNombre: (data.clienteNombre as string) || null,
    marca: (data.marca as string) || null,
    modelo: (data.modelo as string) || null,
    fechaIngreso: toDate(data.fechaIngreso),
    fechaPrometida: toDate(data.fechaPrometida),
    estado: (data.estado as any) || "BORRADOR",
    observaciones: (data.observaciones as string) || null,
    kilometraje: (data.kilometraje as number) ?? null,
    nivelCombustible: (data.nivelCombustible as string) || null,
    estadoCotizacion: (data.estadoCotizacion as any) || "BORRADOR",
    subtotal: Number(data.subtotal) || 0,
    descuentoTotal: Number(data.descuentoTotal) || 0,
    total: Number(data.total) || 0,
    totalPagado: Number(data.totalPagado) || 0,
    saldoPendiente: Number(data.saldoPendiente) || 0,
    controlCalidad: (data.controlCalidad as any) || null,
    entrega: (data.entrega as any) || null,
    creadoEn: toDate(data.creadoEn),
    actualizadoEn: toDate(data.actualizadoEn),
  };
}

/** Marca ready cuando las 4 colecciones ya entregaron al menos 1 snapshot */
function trackReady(
  flags: {
    clientes: boolean;
    vehiculos: boolean;
    catalogo: boolean;
    ordenes: boolean;
  },
  set: (p: Partial<BootstrapState>) => void,
) {
  if (flags.clientes && flags.vehiculos && flags.catalogo && flags.ordenes) {
    set({ ready: true, loading: false, error: null });
  }
}

export const useBootstrapStore = create<BootstrapState>((set, get) => ({
  ready: false,
  loading: false,
  error: null,
  _unsubs: [],

  startRealtime: () => {
    // Evitar doble suscripción (Strict Mode / re-mount)
    if (get()._unsubs.length > 0) return;

    set({ loading: true, error: null, ready: false });

    const flags = {
      clientes: false,
      vehiculos: false,
      catalogo: false,
      ordenes: false,
    };

    const unsubs: Unsubscribe[] = [];

    // ----- CLIENTES -----
    unsubs.push(
      onSnapshot(
        query(collection(db, "clientes"), orderBy("creadoEn", "desc")),
        (snap) => {
          const clientes = snap.docs.map((d) =>
            mapCliente(d.id, d.data() as Record<string, unknown>),
          );
          useClientesStore.setState({
            clientes,
            loading: false,
            error: null,
          });

          // Re-enlazar dueños en vehículos ya cargados
          const vehiculos = useVehiculosStore.getState().vehiculos;
          if (vehiculos.length > 0) {
            const byId = new Map(clientes.map((c) => [c.id, c]));
            useVehiculosStore.setState({
              vehiculos: vehiculos.map((v) => {
                const c = byId.get(v.clienteId) || null;
                return {
                  ...v,
                  cliente: c,
                  clienteNombre: c?.nombre || v.clienteNombre,
                };
              }),
            });
          }

          flags.clientes = true;
          trackReady(flags, set);
        },
        (err) => {
          console.error("clientes snapshot:", err);
          useClientesStore.setState({
            loading: false,
            error: err.message,
          });
          set({ error: err.message, loading: false });
        },
      ),
    );

    // ----- VEHÍCULOS -----
    unsubs.push(
      onSnapshot(
        query(collection(db, "vehiculos"), orderBy("creadoEn", "desc")),
        (snap) => {
          const clientes = useClientesStore.getState().clientes;
          const byId = new Map(clientes.map((c) => [c.id, c]));

          const vehiculos = snap.docs.map((d) => {
            const v = mapVehiculo(d.id, d.data() as Record<string, unknown>);
            const c = byId.get(v.clienteId) || null;
            return {
              ...v,
              cliente: c,
              clienteNombre: c?.nombre || v.clienteNombre,
            };
          });

          useVehiculosStore.setState({
            vehiculos,
            loading: false,
            error: null,
          });
          flags.vehiculos = true;
          trackReady(flags, set);
        },
        (err) => {
          console.error("vehiculos snapshot:", err);
          useVehiculosStore.setState({
            loading: false,
            error: err.message,
          });
          set({ error: err.message, loading: false });
        },
      ),
    );

    // ----- CATÁLOGO -----
    unsubs.push(
      onSnapshot(
        query(collection(db, "catalogo"), orderBy("nombre", "asc")),
        (snap) => {
          const servicios = snap.docs
            .map((d) => mapServicio(d.id, d.data() as Record<string, unknown>))
            .filter((s) => s.activo !== false);

          useCatalogoStore.setState({
            servicios,
            loading: false,
            error: null,
          });
          flags.catalogo = true;
          trackReady(flags, set);
        },
        (err) => {
          console.error("catalogo snapshot:", err);
          useCatalogoStore.setState({
            loading: false,
            error: err.message,
          });
          set({ error: err.message, loading: false });
        },
      ),
    );

    // ----- ÓRDENES -----
    unsubs.push(
      onSnapshot(
        query(collection(db, "ordenes"), orderBy("fechaIngreso", "desc")),
        (snap) => {
          const ordenes = snap.docs.map((d) =>
            mapOrden(d.id, d.data() as Record<string, unknown>),
          );
          useOrdenesStore.setState({
            ordenes,
            loading: false,
            error: null,
          });
          flags.ordenes = true;
          trackReady(flags, set);
        },
        (err) => {
          console.error("ordenes snapshot:", err);
          useOrdenesStore.setState({
            loading: false,
            error: err.message,
          });
          set({ error: err.message, loading: false });
        },
      ),
    );

    set({ _unsubs: unsubs });
  },

  stopRealtime: () => {
    get()._unsubs.forEach((u) => u());
    set({
      _unsubs: [],
      ready: false,
      loading: false,
    });
  },
}));
