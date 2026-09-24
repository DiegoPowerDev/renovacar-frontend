export type StatsFiltros = {
  desde?: string; // YYYY-MM-DD
  hasta?: string; // YYYY-MM-DD
  estado?: string; // BORRADOR | EN_PROCESO | LISTO | ENTREGADO | CANCELADA
  placa?: string;
  clienteId?: string;
};

export interface Cliente {
  id: string;
  nombre: string;
  dniRuc: string;
  telefono: string;
  whatsapp: string;
  correo: string;
  creadoEn: string;
}

export interface Vehiculo {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: string;
  color: string;
  vin: string;
  creadoEn: string;
  actualizadoEn: string;
  cliente: Cliente;
}

export interface Vehiculo {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: string;
  color: string;
  vin: string;
  creadoEn: string;
  actualizadoEn: string;
  cliente: Cliente;
}

export interface ItemCatalogo {
  id: string;
  nombre: string;
  descripcion: string;
  precioBase: number;
}
