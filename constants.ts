import { Factory, OrderStatus, QuoteStatus } from './types';

export const FACTORY_PRODUCTS: Record<Factory, string[]> = {
  [Factory.ALUMBRA]: ['Acabamentos Elétricos', 'Disjuntores'],
  [Factory.MGM]: ['Kit porta pronta', 'Esquadrias de alumínio', 'Fechadura', 'Alizar'],
  [Factory.DM2]: ['Porta Corta-fogo'],
  [Factory.DACAPO]: ['Revestimentos'],
  [Factory.ROCA]: ['Sanitários', 'Porcelanato'],
  [Factory.CONDEX]: ['Cabos'],
  [Factory.CONSTRUCOM]: ['Blocos de concreto', 'Piso intertravado', 'Argamassas'],
};

export const QUOTE_STATUS_OPTIONS = Object.values(QuoteStatus);
export const ORDER_STATUS_OPTIONS = Object.values(OrderStatus);
export const FACTORY_OPTIONS = Object.values(Factory);

export const DEFAULT_LEAD_TIME_DAYS = 15;

export const PAYMENT_TERMS_OPTIONS = [
  "Antecipado",
  "28 dias",
  "30 dias",
  "45 dias",
  "60 dias",
  "28/56 dias",
  "30/60 dias",
  "30/60/90 dias",
  "30/60/90/120 dias"
];

// Date Utilities to replace date-fns
export const parseISO = (dateString: string): Date => {
  if (!dateString) return new Date();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [y, m, d] = dateString.split('-').map(Number);
      return new Date(y, m - 1, d);
  }
  return new Date(dateString);
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const startOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

export const endOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

export const differenceInDays = (dateLeft: Date, dateRight: Date): number => {
  const d1 = new Date(dateLeft.getFullYear(), dateLeft.getMonth(), dateLeft.getDate());
  const d2 = new Date(dateRight.getFullYear(), dateRight.getMonth(), dateRight.getDate());
  return Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
};

export const isAfter = (date: Date, dateToCompare: Date): boolean => {
  return date.getTime() > dateToCompare.getTime();
};

export const getMonth = (date: Date): number => date.getMonth();
export const getYear = (date: Date): number => date.getFullYear();

export const format = (date: Date, fmt: string, options?: any): string => {
  const d = date;
  const yyyy = d.getFullYear();
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const HH = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');

  if (fmt === 'yyyy-MM-dd') return `${yyyy}-${MM}-${dd}`;
  if (fmt === 'dd/MM/yyyy') return `${dd}/${MM}/${yyyy}`;
  if (fmt === 'dd/MM/yyyy HH:mm') return `${dd}/${MM}/${yyyy} ${HH}:${mm}`;
  if (fmt === 'dd/MM') return `${dd}/${MM}`;
  
  if (fmt === 'MMM/yyyy') {
     const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
     return `${months[d.getMonth()]}/${yyyy}`;
  }

  return d.toISOString();
};
