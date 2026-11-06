const ZONA = 'America/Argentina/Tucuman';

const fFechaHora = new Intl.DateTimeFormat('es-AR', {
  timeZone: ZONA, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
});
const fFecha = new Intl.DateTimeFormat('es-AR', { timeZone: ZONA, day: '2-digit', month: '2-digit', year: 'numeric' });
const fFechaLarga = new Intl.DateTimeFormat('es-AR', { timeZone: ZONA, day: 'numeric', month: 'long', year: 'numeric' });
const fHora = new Intl.DateTimeFormat('es-AR', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hour12: false });
const fDiaCorto = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', timeZone: 'UTC' });
const fNumero = new Intl.NumberFormat('es-AR');

export const fechaHora = (iso: string | null | undefined) => (iso ? `${fFechaHora.format(new Date(iso)).replace(',', '')} hs` : '—');
export const fecha = (iso: string | null | undefined) => (iso ? fFecha.format(new Date(iso)) : '—');
export const fechaLarga = (iso: string | Date) => fFechaLarga.format(typeof iso === 'string' ? new Date(iso) : iso);
export const hora = (d: Date) => fHora.format(d);
export const numero = (n: number) => fNumero.format(n);

/** Para fechas sin hora (DateOnly) que llegan como "2026-11-06". */
export const diaCorto = (isoFecha: string) => fDiaCorto.format(new Date(`${isoFecha}T00:00:00Z`)).replace('.', '');
export const fechaSolo = (isoFecha: string | null | undefined) => {
  if (!isoFecha) return '—';
  const [a, m, d] = isoFecha.split('-');
  return `${d}/${m}/${a}`;
};

export function haceCuanto(iso: string) {
  const minutos = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutos < 1) return 'recién';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.round(horas / 24);
  return dias === 1 ? 'ayer' : `hace ${dias} días`;
}

export function tamanoArchivo(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function iniciales(nombre: string, apellido: string) {
  return `${nombre.trim()[0] ?? ''}${apellido.trim()[0] ?? ''}`.toUpperCase();
}

/** Valor para un <input type="datetime-local"> en hora local del navegador. */
export function aInputFechaHora(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Convierte el valor de un datetime-local a ISO con la zona del navegador. */
export function deInputFechaHora(valor: string) {
  return new Date(valor).toISOString();
}

export function formatearDni(dni: string) {
  return dni.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function distanciaKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
