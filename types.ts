export enum Factory {
  ALUMBRA = 'Alumbra',
  MGM = 'MGM',
  DM2 = 'DM2',
  DACAPO = 'DACAPO',
  ROCA = 'Roca',
  CONDEX = 'Condex',
  CONSTRUCOM = 'Construcom'
}

export enum QuoteStatus {
  ENVIADO = 'Enviado',
  EM_NEGOCIACAO = 'Em negociação',
  FECHADO = 'Fechado',
  PERDIDO = 'Perdido'
}

export enum OrderStatus {
  AGUARDANDO_DIGITACAO = 'Aguardando digitação',
  LIBERADO = 'Liberado',
  CREDITO = 'Crédito',
  CANCELADO = 'Cancelado',
  FATURADO = 'Faturado'
}

export interface FollowUp {
  id: string;
  date: string;
  note: string;
}

export interface Quote {
  id: string;
  constructorName: string;
  workName: string;
  date: string; // ISO Date
  factory: Factory;
  product: string;
  status: QuoteStatus;
  value: number;
  contactName: string;
  phone: string;
  email: string;
  followUps: FollowUp[];
}

export interface Order {
  id: string;
  constructorName: string;
  workName: string;
  poNumber: string;
  sendDate: string; // ISO Date
  deliveryDate: string; // ISO Date
  isManualDeliveryDate: boolean; // Flag for manual override
  factory: Factory;
  product: string;
  quantity: number;
  value: number;
  status: OrderStatus;
  statusDate: string; // ISO Date
  systemForecast?: string; // ISO Date
  
  // Billing fields
  invoiceDate?: string;
  paymentTerms?: string;
  commissionRate?: number;
}

export interface ProductSettings {
  leadTimeDays: number;
}

export interface TargetSettings {
  monthlyTarget: number;
}

export interface AppSettings {
  products: Record<string, ProductSettings>; // Product Name -> Settings
  targets: Record<string, TargetSettings>; // Factory Name -> Settings
}

export interface User {
  email: string;
  name: string;
}