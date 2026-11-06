import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, LocateFixed, MapPin, Paperclip, Trash2 } from 'lucide-react';
import { api } from '@/api/cliente';
import { ORDEN_TIPOS, TIPOS_CON_BIENES, TIPOS_DELITO } from '@/api/etiquetas';
import type { DependenciaPublica, TipoDelito } from '@/api/tipos';
import { LOCALIDADES } from '@/config';
import { aInputFechaHora, deInputFechaHora, distanciaKm, tamanoArchivo } from '@/lib/formato';
import { IconoTipo } from './IconoTipo';
import { SelectorUbicacion } from './Mapa';
import { Aviso, Campo } from './ui';

export interface DatosDenunciante {
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: string;
  telefono: string;
  email: string;
  domicilio: string;
  localidad: string;
}

export interface DatosDenuncia {
  tipo: TipoDelito | null;
  fechaHecho: string;
  lugarHecho: string;
  localidad: string;
  ubicacion: [number, number] | null;
  relato: string;
  bienesInvolucrados: string;
  denunciante: DatosDenunciante;
  adjuntos: File[];
  declaracionJurada: boolean;
}

export type Errores = Record<string, string | undefined>;

export const MAXIMO_ADJUNTOS = 5;
const TAMANO_MAXIMO = 10 * 1024 * 1024;
const TIPOS_ARCHIVO = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export const LARGO_MINIMO_RELATO = 30;

export function datosIniciales(): DatosDenuncia {
  return {
    tipo: null,
    fechaHecho: '',
    lugarHecho: '',
    localidad: 'San Miguel de Tucumán',
    ubicacion: null,
    relato: '',
    bienesInvolucrados: '',
    denunciante: { nombre: '', apellido: '', dni: '', fechaNacimiento: '', telefono: '', email: '', domicilio: '', localidad: 'San Miguel de Tucumán' },
    adjuntos: [],
    declaracionJurada: false,
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarTipo(d: DatosDenuncia): Errores {
  return d.tipo ? {} : { tipo: 'Seleccioná el tipo de hecho.' };
}

export function validarHecho(d: DatosDenuncia): Errores {
  const e: Errores = {};
  if (!d.fechaHecho) e.fechaHecho = 'Indicá la fecha y hora aproximada.';
  else if (new Date(d.fechaHecho).getTime() > Date.now() + 5 * 60_000) e.fechaHecho = 'La fecha no puede ser posterior a hoy.';
  if (!d.localidad.trim()) e.localidad = 'Indicá la localidad.';
  if (!d.lugarHecho.trim()) e.lugarHecho = 'Indicá la dirección o una referencia del lugar.';
  if (d.relato.trim().length < LARGO_MINIMO_RELATO) e.relato = `Contá con más detalle cómo ocurrió (mínimo ${LARGO_MINIMO_RELATO} caracteres).`;
  return e;
}

export function validarDenunciante(d: DatosDenuncia, emailObligatorio: boolean): Errores {
  const p = d.denunciante;
  const e: Errores = {};
  if (!p.nombre.trim()) e['denunciante.nombre'] = 'Ingresá el nombre.';
  if (!p.apellido.trim()) e['denunciante.apellido'] = 'Ingresá el apellido.';
  const dni = p.dni.replace(/\D/g, '');
  if (dni.length < 7 || dni.length > 8 || dni.startsWith('0')) e['denunciante.dni'] = 'Ingresá un DNI válido (7 u 8 dígitos).';
  if (emailObligatorio && !p.email.trim()) e['denunciante.email'] = 'Ingresá un correo para recibir la constancia.';
  else if (p.email.trim() && !EMAIL.test(p.email.trim())) e['denunciante.email'] = 'El correo electrónico no es válido.';
  if (!p.domicilio.trim()) e['denunciante.domicilio'] = 'Ingresá el domicilio.';
  if (!p.localidad.trim()) e['denunciante.localidad'] = 'Ingresá la localidad.';
  return e;
}

export function aFormData(d: DatosDenuncia, extra: Record<string, string> = {}) {
  const f = new FormData();
  f.set('tipo', d.tipo ?? '');
  f.set('fechaHecho', d.fechaHecho ? deInputFechaHora(d.fechaHecho) : '');
  f.set('lugarHecho', d.lugarHecho.trim());
  f.set('localidad', d.localidad.trim());
  if (d.ubicacion) {
    f.set('latitud', d.ubicacion[0].toFixed(6));
    f.set('longitud', d.ubicacion[1].toFixed(6));
  }
  f.set('relato', d.relato.trim());
  if (d.bienesInvolucrados.trim()) f.set('bienesInvolucrados', d.bienesInvolucrados.trim());
  for (const [clave, valor] of Object.entries(d.denunciante)) {
    if (valor.trim()) f.set(`denunciante.${clave}`, valor.trim());
  }
  f.set('declaracionJurada', String(d.declaracionJurada));
  d.adjuntos.forEach((a) => f.append('adjuntos', a, a.name));
  for (const [clave, valor] of Object.entries(extra)) f.set(clave, valor);
  return f;
}

/** Adapta los errores de validación del servidor (claves en PascalCase) a las claves del formulario. */
export function erroresDelServidor(errores: Record<string, string[]>): Errores {
  const salida: Errores = {};
  for (const [clave, mensajes] of Object.entries(errores)) {
    const normalizada = clave
      .replace(/^\$\./, '')
      .split('.')
      .map((parte) => parte.charAt(0).toLowerCase() + parte.slice(1))
      .join('.');
    salida[normalizada] = mensajes[0];
  }
  return salida;
}

/* ------------------------------------------------------------------ Secciones */

export function SeccionTipo({ valor, onCambiar, error }: { valor: TipoDelito | null; onCambiar: (t: TipoDelito) => void; error?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="opciones-tipo" role="group" aria-label="Tipo de hecho">
        {ORDEN_TIPOS.map((tipo) => (
          <button key={tipo} type="button" className="opcion-tipo" aria-pressed={valor === tipo} onClick={() => onCambiar(tipo)}>
            <IconoTipo tipo={tipo} />
            <strong>{TIPOS_DELITO[tipo].nombre}</strong>
            <span>{TIPOS_DELITO[tipo].descripcion}</span>
          </button>
        ))}
      </div>
      {error && <span className="campo-error">{error}</span>}
      {valor === 'ViolenciaFamiliar' && (
        <Aviso tipo="alerta">
          <strong>Si estás en peligro, llamá al 911.</strong> Para orientación y acompañamiento en situaciones de violencia de género
          comunicate con la Línea 144, gratuita y disponible las 24 horas.
        </Aviso>
      )}
      {(valor === 'Lesiones' || valor === 'Robo') && (
        <Aviso tipo="info">Si el hecho está ocurriendo ahora o hay personas heridas, comunicate con el <strong>911</strong>.</Aviso>
      )}
    </div>
  );
}

interface PropsSeccion {
  datos: DatosDenuncia;
  cambiar: (cambios: Partial<DatosDenuncia>) => void;
  errores: Errores;
}

export function SeccionHecho({ datos, cambiar, errores }: PropsSeccion) {
  const [centro, setCentro] = useState<[number, number] | null>(null);
  const [ubicando, setUbicando] = useState(false);
  const [errorUbicacion, setErrorUbicacion] = useState<string>();
  const { data: dependencias } = useQuery({
    queryKey: ['publico', 'dependencias'],
    queryFn: () => api.get<DependenciaPublica[]>('/publico/dependencias'),
    staleTime: 10 * 60_000,
  });

  const jurisdiccion = useMemo(() => {
    if (!datos.ubicacion || !dependencias) return null;
    const [lat, lng] = datos.ubicacion;
    return dependencias
      .filter((d) => d.latitud !== null && d.longitud !== null)
      .map((d) => ({ d, km: distanciaKm(lat, lng, d.latitud!, d.longitud!) }))
      .sort((a, b) => a.km - b.km)[0] ?? null;
  }, [datos.ubicacion, dependencias]);

  const usarMiUbicacion = () => {
    if (!navigator.geolocation) {
      setErrorUbicacion('Tu navegador no permite obtener la ubicación.');
      return;
    }
    setUbicando(true);
    setErrorUbicacion(undefined);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const punto: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        cambiar({ ubicacion: punto });
        setCentro(punto);
        setUbicando(false);
      },
      () => {
        setErrorUbicacion('No pudimos obtener tu ubicación. Marcá el lugar tocando el mapa.');
        setUbicando(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const conBienes = datos.tipo && TIPOS_CON_BIENES.includes(datos.tipo);

  return (
    <div className="grilla-form">
      <Campo etiqueta="Fecha y hora aproximada" requerido error={errores.fechaHecho}>
        {(id, desc) => (
          <input id={id} aria-describedby={desc} aria-invalid={!!errores.fechaHecho} className="entrada" type="datetime-local"
            max={aInputFechaHora(new Date())} value={datos.fechaHecho} onChange={(e) => cambiar({ fechaHecho: e.target.value })} />
        )}
      </Campo>
      <Campo etiqueta="Localidad" requerido error={errores.localidad}>
        {(id, desc) => (
          <>
            <input id={id} aria-describedby={desc} aria-invalid={!!errores.localidad} className="entrada" list="localidades"
              value={datos.localidad} onChange={(e) => cambiar({ localidad: e.target.value })} />
            <datalist id="localidades">{LOCALIDADES.map((l) => <option key={l} value={l} />)}</datalist>
          </>
        )}
      </Campo>
      <Campo etiqueta="Dirección o referencia del lugar" requerido error={errores.lugarHecho} className="ancho-completo"
        ayuda="Calle y altura, o una referencia (ej.: Plaza Independencia, frente a la Casa de Gobierno).">
        {(id, desc) => (
          <input id={id} aria-describedby={desc} aria-invalid={!!errores.lugarHecho} className="entrada" maxLength={200}
            value={datos.lugarHecho} onChange={(e) => cambiar({ lugarHecho: e.target.value })} placeholder="Ej.: 24 de Septiembre 350" />
        )}
      </Campo>

      <div className="campo ancho-completo">
        <span className="campo-etiqueta">Ubicación en el mapa</span>
        <div className="selector-mapa">
          <SelectorUbicacion valor={datos.ubicacion} centro={centro} onCambiar={(lat, lng) => cambiar({ ubicacion: [lat, lng] })} />
          <div className="acciones-mapa">
            <button type="button" className="btn btn-secundario btn-sm" onClick={usarMiUbicacion} disabled={ubicando}>
              <LocateFixed /> {ubicando ? 'Ubicando…' : 'Usar mi ubicación'}
            </button>
          </div>
        </div>
        {errorUbicacion ? (
          <span className="campo-error">{errorUbicacion}</span>
        ) : jurisdiccion ? (
          <span className="campo-ayuda" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MapPin size={14} aria-hidden /> Jurisdicción estimada: <strong>{jurisdiccion.d.nombre}</strong> ({jurisdiccion.km.toFixed(1)} km)
          </span>
        ) : (
          <span className="campo-ayuda">Tocá el mapa para marcar dónde ocurrió el hecho. Es opcional, pero agiliza la asignación.</span>
        )}
      </div>

      <Campo etiqueta="¿Qué pasó?" requerido error={errores.relato} className="ancho-completo"
        ayuda={`${datos.relato.trim().length} caracteres. Contá los hechos en orden: qué ocurrió, cómo, si hubo testigos o cámaras, y cómo eran los autores.`}>
        {(id, desc) => (
          <textarea id={id} aria-describedby={desc} aria-invalid={!!errores.relato} className="area" rows={6} maxLength={8000}
            value={datos.relato} onChange={(e) => cambiar({ relato: e.target.value })} />
        )}
      </Campo>

      {conBienes && (
        <Campo etiqueta="Bienes o documentos involucrados" className="ancho-completo" error={errores.bienesInvolucrados}
          ayuda="Marca, modelo, color, dominio, número de serie o IMEI. Ayuda a identificarlos si se recuperan.">
          {(id, desc) => (
            <textarea id={id} aria-describedby={desc} className="area" rows={2} style={{ minHeight: 70 }} maxLength={2000}
              value={datos.bienesInvolucrados} onChange={(e) => cambiar({ bienesInvolucrados: e.target.value })} />
          )}
        </Campo>
      )}
    </div>
  );
}

export function SeccionDenunciante({ datos, cambiar, errores, emailObligatorio }: PropsSeccion & { emailObligatorio: boolean }) {
  const p = datos.denunciante;
  const set = (campo: keyof DatosDenunciante, valor: string) => cambiar({ denunciante: { ...p, [campo]: valor } });
  const err = (campo: string) => errores[`denunciante.${campo}`];

  return (
    <div className="grilla-form">
      <Campo etiqueta="Nombres" requerido error={err('nombre')}>
        {(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!err('nombre')} className="entrada" autoComplete="given-name" value={p.nombre} onChange={(e) => set('nombre', e.target.value)} />}
      </Campo>
      <Campo etiqueta="Apellido" requerido error={err('apellido')}>
        {(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!err('apellido')} className="entrada" autoComplete="family-name" value={p.apellido} onChange={(e) => set('apellido', e.target.value)} />}
      </Campo>
      <Campo etiqueta="DNI" requerido error={err('dni')} ayuda="Sin puntos.">
        {(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!err('dni')} className="entrada" inputMode="numeric" maxLength={10} value={p.dni} onChange={(e) => set('dni', e.target.value.replace(/[^\d]/g, ''))} />}
      </Campo>
      <Campo etiqueta="Fecha de nacimiento">
        {(id) => <input id={id} className="entrada" type="date" value={p.fechaNacimiento} onChange={(e) => set('fechaNacimiento', e.target.value)} />}
      </Campo>
      <Campo etiqueta="Correo electrónico" requerido={emailObligatorio} error={err('email')}
        ayuda={emailObligatorio ? 'Te enviamos la constancia y las novedades a esta dirección.' : undefined}>
        {(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!err('email')} className="entrada" type="email" autoComplete="email" value={p.email} onChange={(e) => set('email', e.target.value)} />}
      </Campo>
      <Campo etiqueta="Teléfono" error={err('telefono')}>
        {(id, d) => <input id={id} aria-describedby={d} className="entrada" type="tel" autoComplete="tel" value={p.telefono} onChange={(e) => set('telefono', e.target.value)} placeholder="381 5xx-xxxx" />}
      </Campo>
      <Campo etiqueta="Domicilio" requerido error={err('domicilio')}>
        {(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!err('domicilio')} className="entrada" autoComplete="street-address" value={p.domicilio} onChange={(e) => set('domicilio', e.target.value)} />}
      </Campo>
      <Campo etiqueta="Localidad" requerido error={err('localidad')}>
        {(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!err('localidad')} className="entrada" list="localidades-denunciante" value={p.localidad} onChange={(e) => set('localidad', e.target.value)} />}
      </Campo>
      <datalist id="localidades-denunciante">{LOCALIDADES.map((l) => <option key={l} value={l} />)}</datalist>
    </div>
  );
}

export function SeccionAdjuntos({ archivos, onCambiar }: { archivos: File[]; onCambiar: (a: File[]) => void }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const vistas = useMemo(() => archivos.map((a) => (a.type.startsWith('image/') ? URL.createObjectURL(a) : null)), [archivos]);
  useEffect(() => () => vistas.forEach((v) => v && URL.revokeObjectURL(v)), [vistas]);

  const agregar = (lista: FileList | null) => {
    if (!lista) return;
    setError(undefined);
    const nuevos: File[] = [];
    for (const archivo of Array.from(lista)) {
      if (!TIPOS_ARCHIVO.includes(archivo.type)) { setError(`"${archivo.name}" no es un formato admitido (JPG, PNG, WEBP o PDF).`); continue; }
      if (archivo.size > TAMANO_MAXIMO) { setError(`"${archivo.name}" supera los 10 MB.`); continue; }
      nuevos.push(archivo);
    }
    const total = [...archivos, ...nuevos];
    if (total.length > MAXIMO_ADJUNTOS) setError(`Podés adjuntar hasta ${MAXIMO_ADJUNTOS} archivos.`);
    onCambiar(total.slice(0, MAXIMO_ADJUNTOS));
    if (entrada.current) entrada.current.value = '';
  };

  return (
    <div className="campo">
      <span className="campo-etiqueta">Fotos o documentos (opcional)</span>
      <div className="lista-adjuntos">
        {archivos.map((archivo, i) => (
          <div key={`${archivo.name}-${i}`} className="adjunto-item">
            {vistas[i] ? <img src={vistas[i]!} alt="" /> : <div className="icono-archivo"><FileText size={20} /></div>}
            <span className="nombre">{archivo.name}</span>
            <span className="texto-suave">{tamanoArchivo(archivo.size)}</span>
            <button type="button" className="btn btn-fantasma btn-icono btn-sm" aria-label={`Quitar ${archivo.name}`}
              onClick={() => onCambiar(archivos.filter((_, j) => j !== i))}><Trash2 /></button>
          </div>
        ))}
        {archivos.length < MAXIMO_ADJUNTOS && (
          <label className="zona-archivos">
            <Paperclip aria-hidden />
            <span>Agregar archivos · JPG, PNG, WEBP o PDF hasta 10 MB</span>
            <input ref={entrada} type="file" multiple accept={TIPOS_ARCHIVO.join(',')} className="sr-only" onChange={(e) => agregar(e.target.files)} />
          </label>
        )}
      </div>
      {error && <span className="campo-error">{error}</span>}
    </div>
  );
}
