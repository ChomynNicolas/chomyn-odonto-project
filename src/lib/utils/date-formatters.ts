// Date formatting utilities

import { format, formatDistanceToNow, differenceInYears, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export function formatAge(birthDate: Date | string | null): number | null {
  if (!birthDate) return null;
  
  const date = typeof birthDate === 'string' ? parseISO(birthDate) : birthDate;
  if (!isValid(date)) return null;
  
  return differenceInYears(new Date(), date);
}

export function formatAppointmentDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return 'Fecha inválida';
  
  return format(d, "PPP 'a las' p", { locale: es });
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return 'Fecha inválida';
  
  return formatDistanceToNow(d, { addSuffix: true, locale: es });
}

export function formatShortDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return 'Fecha inválida';
  
  return format(d, 'PP', { locale: es });
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return 'Hora inválida';
  
  return format(d, 'p', { locale: es });
}
