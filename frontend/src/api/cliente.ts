export class ErrorApi extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errores: Record<string, string[]> = {},
    public readonly detalle?: string,
  ) {
    super(message);
    this.name = 'ErrorApi';
  }

  /** Primer error de validación de un campo (las claves llegan en PascalCase desde la API). */
  campo(nombre: string): string | undefined {
    const buscado = nombre.toLowerCase();
    const clave = Object.keys(this.errores).find((k) => k.toLowerCase() === buscado);
    return clave ? this.errores[clave]?.[0] : undefined;
  }
}

export const EVENTO_SESION_EXPIRADA = 'sgp:sesion-expirada';

type Parametros = Record<string, string | number | boolean | null | undefined>;

function armarUrl(ruta: string, parametros?: Parametros) {
  const url = new URL(`/api${ruta}`, window.location.origin);
  if (parametros) {
    for (const [clave, valor] of Object.entries(parametros)) {
      if (valor !== undefined && valor !== null && valor !== '' && valor !== false) {
        url.searchParams.set(clave, String(valor));
      }
    }
  }
  return url.pathname + url.search;
}

async function solicitud<T>(metodo: string, ruta: string, cuerpo?: unknown, parametros?: Parametros): Promise<T> {
  const esFormulario = cuerpo instanceof FormData;
  let respuesta: Response;
  try {
    respuesta = await fetch(armarUrl(ruta, parametros), {
      method: metodo,
      credentials: 'same-origin',
      headers: cuerpo !== undefined && !esFormulario ? { 'Content-Type': 'application/json' } : undefined,
      body: cuerpo === undefined ? undefined : esFormulario ? (cuerpo as FormData) : JSON.stringify(cuerpo),
    });
  } catch {
    throw new ErrorApi('No se pudo conectar con el servidor. Verificá tu conexión a internet.', 0);
  }

  if (respuesta.status === 204 || respuesta.status === 202) {
    return undefined as T;
  }

  const esJson = respuesta.headers.get('content-type')?.includes('json');
  const datos = esJson ? await respuesta.json() : null;

  if (!respuesta.ok) {
    if (respuesta.status === 401 && !ruta.startsWith('/auth/')) {
      window.dispatchEvent(new Event(EVENTO_SESION_EXPIRADA));
    }
    const titulo = datos?.title && datos.title !== 'Unauthorized' ? datos.title : mensajePorEstado(respuesta.status);
    throw new ErrorApi(titulo, respuesta.status, datos?.errors ?? {}, datos?.detail);
  }

  return datos as T;
}

function mensajePorEstado(estado: number) {
  switch (estado) {
    case 401: return 'Tu sesión finalizó. Ingresá nuevamente.';
    case 403: return 'No tenés permisos para realizar esta acción.';
    case 404: return 'El recurso solicitado no existe.';
    case 413: return 'Los archivos superan el tamaño permitido.';
    case 429: return 'Se realizaron demasiadas solicitudes. Esperá unos minutos.';
    default: return 'Ocurrió un error inesperado. Intentá nuevamente.';
  }
}

export const api = {
  get: <T>(ruta: string, parametros?: Parametros) => solicitud<T>('GET', ruta, undefined, parametros),
  post: <T = void>(ruta: string, cuerpo?: unknown) => solicitud<T>('POST', ruta, cuerpo ?? {}),
  put: <T = void>(ruta: string, cuerpo: unknown) => solicitud<T>('PUT', ruta, cuerpo),
  patch: <T = void>(ruta: string, cuerpo: unknown) => solicitud<T>('PATCH', ruta, cuerpo),
  url: armarUrl,
};

/** Mensaje para mostrar a partir de cualquier error. */
export function mensajeDeError(error: unknown): string {
  if (error instanceof ErrorApi) {
    return error.status === 400 && error.detalle ? error.detalle : error.message;
  }
  return 'Ocurrió un error inesperado. Intentá nuevamente.';
}
