import { api } from "@/content/api";
import { StatsFiltros } from "@/types/types";

export const statsApi = {
  // Dashboard completo (con o sin filtros)
  getAll: async (filtros?: StatsFiltros) => {
    const res = await api.get("/stats", { params: filtros });
    return res.data;
  },

  // Resumen rápido para las cards del home
  getResumen: async () => {
    const res = await api.get("/stats/resumen");
    return res.data;
  },
};

// ======================
// CLIENTES
// ======================
export const clientesApi = {
  getAll: async () => {
    const res = await api.get("/clientes");
    return res.data;
  },

  getById: async (id: string) => {
    const res = await api.get(`/clientes/${id}`);
    return res.data;
  },

  getByDni: async (dniRuc: string) => {
    const res = await api.get(`/clientes/dni/${dniRuc}`);
    return res.data;
  },

  getByTelefono: async (telefono: string) => {
    const res = await api.get(`/clientes/telefono/${telefono}`);
    return res.data;
  },

  create: async (data: {
    nombre: string;
    dniRuc?: string;
    telefono?: string;
    whatsapp?: string;
    correo?: string;
  }) => {
    const res = await api.post("/clientes", data);
    return res.data;
  },

  update: async (
    id: string,
    data: {
      nombre?: string;
      dniRuc?: string;
      telefono?: string;
      whatsapp?: string;
      correo?: string;
    },
  ) => {
    const res = await api.patch(`/clientes/${id}`, data);
    return res.data;
  },

  remove: async (id: string) => {
    const res = await api.delete(`/clientes/${id}`);
    return res.data;
  },
};

//VEHICULOS

export const vehiculosApi = {
  getAll: async () => {
    const res = await api.get("/vehiculos");
    return res.data;
  },

  getByPlaca: async (placa: string) => {
    const res = await api.get(`/vehiculos/placa/${placa}`);
    return res.data;
  },

  getHistorial: async (placa: string) => {
    const res = await api.get(`/vehiculos/historial/${placa}`);
    return res.data;
  },

  create: async (data: {
    placa: string;
    marca: string;
    modelo: string;
    anio?: number;
    color?: string;
    vin?: string;
    // Una de estas tres opciones:
    clienteId?: string; // cliente existente por ID
    dniRuc?: string; // cliente existente por DNI/RUC
    cliente?: {
      // crear cliente nuevo
      nombre: string;
      dniRuc?: string;
      telefono?: string;
      whatsapp?: string;
      correo?: string;
    };
  }) => {
    const res = await api.post("/vehiculos", data);
    return res.data;
  },

  update: async (
    id: string,
    data: {
      placa?: string;
      marca?: string;
      modelo?: string;
      anio?: number;
      color?: string;
      vin?: string;
    },
  ) => {
    const res = await api.patch(`/vehiculos/${id}`, data);
    return res.data;
  },

  remove: async (id: string) => {
    const res = await api.delete(`/vehiculos/${id}`);
    return res.data;
  },
};

// ======================
// ÓRDENES DE TRABAJO
// ======================
export const ordenesApi = {
  getAll: async () => {
    const res = await api.get("/ordenes-trabajo");
    return res.data;
  },

  getByNumero: async (numero: string) => {
    const res = await api.get(`/ordenes-trabajo/${numero}`);
    return res.data;
  },

  getByPlaca: async (placa: string) => {
    const res = await api.get(`/ordenes-trabajo/placa/${placa}`);
    return res.data;
  },

  create: async (data: {
    placa: string;
    fechaPrometida?: string;
    observaciones?: string;
    kilometraje?: number;
    nivelCombustible?: string;
  }) => {
    const res = await api.post("/ordenes-trabajo", data);
    return res.data;
  },

  cambiarEstado: async (numero: string, estado: string) => {
    const res = await api.patch(`/ordenes-trabajo/${numero}/estado`, {
      estado,
    });
    return res.data;
  },
};

// ======================
// COTIZACIONES + CATÁLOGO
// ======================
export const cotizacionesApi = {
  // --- Catálogo ---
  traerServicios: async (todos = false) => {
    const res = await api.get("/cotizaciones/catalogo/servicios", {
      params: todos ? { todos: "true" } : undefined,
    });
    return res.data;
  },

  getServicio: async (id: string) => {
    const res = await api.get(`/cotizaciones/catalogo/servicios/${id}`);
    return res.data;
  },

  crearServicio: async (data: {
    nombre: string;
    descripcion?: string;
    precioBase: number;
  }) => {
    const res = await api.post("/cotizaciones/catalogo/servicios", data);
    return res.data;
  },

  actualizarServicio: async (
    id: string,
    data: {
      nombre?: string;
      descripcion?: string;
      precioBase?: number;
      activo?: boolean;
    },
  ) => {
    const res = await api.patch(`/cotizaciones/catalogo/servicios/${id}`, data);
    return res.data;
  },

  eliminarServicio: async (id: string) => {
    const res = await api.delete(`/cotizaciones/catalogo/servicios/${id}`);
    return res.data;
  },

  // --- Cotización por OT ---
  getByOT: async (numeroOT: string) => {
    const res = await api.get(`/cotizaciones/${numeroOT}`);
    return res.data;
  },

  agregarItem: async (data: {
    numeroOT: string;
    nombre: string;
    descripcion?: string;
    cantidad?: number;
    precioUnitario: number;
    descuento?: number;
    servicioCatalogoId?: string;
  }) => {
    const res = await api.post("/cotizaciones/items", data);
    return res.data;
  },

  eliminarItem: async (itemId: string) => {
    const res = await api.delete(`/cotizaciones/items/${itemId}`);
    return res.data;
  },

  cambiarEstado: async (numeroOT: string, estado: string) => {
    const res = await api.patch(`/cotizaciones/${numeroOT}/estado`, { estado });
    return res.data;
  },
};

// ======================
// PAGOS
// ======================
export const pagosApi = {
  getByOT: async (numeroOT: string) => {
    const res = await api.get(`/pagos/${numeroOT}`);
    return res.data;
  },

  registrar: async (data: {
    numeroOT: string;
    monto: number;
    metodo: string;
    comprobante?: string;
    observaciones?: string;
  }) => {
    const res = await api.post("/pagos", data);
    return res.data;
  },
};

// ======================
// PRODUCCIÓN
// ======================
export const produccionApi = {
  generarEtapas: async (numeroOT: string, tipo?: string) => {
    const res = await api.post("/produccion/generar", { numeroOT, tipo });
    return res.data;
  },

  getEtapas: async (numeroOT: string) => {
    const res = await api.get(`/produccion/${numeroOT}`);
    return res.data;
  },

  iniciarEtapa: async (etapaId: string, responsable?: string) => {
    const res = await api.patch(`/produccion/etapa/${etapaId}/iniciar`, {
      responsable,
    });
    return res.data;
  },

  terminarEtapa: async (etapaId: string, observaciones?: string) => {
    const res = await api.patch(`/produccion/etapa/${etapaId}/terminar`, {
      observaciones,
    });
    return res.data;
  },

  dashboard: async () => {
    const res = await api.get("/produccion/dashboard/resumen");
    return res.data;
  },
};
