const CLAVE_TOKEN = 'es_token';

function leerToken() {
  try { return localStorage.getItem(CLAVE_TOKEN); } catch { return null; }
}

export const hayToken = () => Boolean(leerToken());

export function guardarToken(token) {
  try { token ? localStorage.setItem(CLAVE_TOKEN, token) : localStorage.removeItem(CLAVE_TOKEN); } catch { /* sin almacenamiento */ }
}

export class ErrorApi extends Error {
  constructor(mensaje, status) { super(mensaje); this.status = status; }
}

export async function api(ruta, { method = 'GET', body } = {}) {
  const headers = { Accept: 'application/json' };
  const token = leerToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(`/api${ruta}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ErrorApi('Sin conexión. Revisá tu señal e intentá de nuevo.', 0);
  }
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) throw new ErrorApi(datos.error || 'Ocurrió un error.', res.status);
  return datos;
}

export const get = (ruta) => api(ruta);
export const post = (ruta, body = {}) => api(ruta, { method: 'POST', body });
export const patch = (ruta, body = {}) => api(ruta, { method: 'PATCH', body });
export const put = (ruta, body = {}) => api(ruta, { method: 'PUT', body });
export const del = (ruta) => api(ruta, { method: 'DELETE' });

/** Descarga un archivo autenticado (ej. el CSV de la administración). */
export async function descargar(ruta, nombre) {
  const res = await fetch(`/api${ruta}`, { headers: { Authorization: `Bearer ${leerToken()}` } });
  if (!res.ok) throw new ErrorApi('No se pudo descargar el archivo.', res.status);
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
