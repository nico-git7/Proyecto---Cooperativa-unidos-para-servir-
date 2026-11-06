import { useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapContainer, Marker } from 'react-leaflet';
import {
  ArrowLeft, ArrowRightLeft, FileText, Mail, Paperclip, Phone, Printer, RefreshCw, Send, UserCheck,
} from 'lucide-react';
import { api, mensajeDeError } from '@/api/cliente';
import { ESTADOS, JERARQUIAS, ORIGENES, PRIORIDADES, TIPOS_DELITO } from '@/api/etiquetas';
import type { Actuacion, DenunciaDetalle, Prioridad } from '@/api/tipos';
import { CapaBase, iconoHecho } from '@/componentes/Mapa';
import { useNotificaciones } from '@/componentes/Notificaciones';
import { Aviso, Cargando, EtiquetaPrioridad, InsigniaEstado, Vacio } from '@/componentes/ui';
import { fechaHora, fechaSolo, formatearDni, haceCuanto, tamanoArchivo } from '@/lib/formato';
import { ModalAsignacion, ModalDerivacion, ModalEstado } from './AccionesDenuncia';

type ModalAbierto = 'estado' | 'asignacion' | 'derivacion' | null;

export default function DetalleDenuncia() {
  const { id } = useParams();
  const [modal, setModal] = useState<ModalAbierto>(null);
  const { data: d, isLoading, error } = useQuery({
    queryKey: ['denuncia', Number(id)],
    queryFn: () => api.get<DenunciaDetalle>(`/denuncias/${id}`),
  });

  if (isLoading) return <Cargando />;
  if (error || !d) return <Aviso tipo="error">{mensajeDeError(error)}</Aviso>;

  const cerrada = ['Resuelta', 'Archivada', 'Desestimada'].includes(d.estado);

  return (
    <>
      <div className="no-imprimir">
        <Link to="/intranet/denuncias" className="btn btn-fantasma btn-sm" style={{ paddingLeft: 4 }}><ArrowLeft /> Volver al listado</Link>
      </div>

      <section className="tarjeta">
        <div className="detalle-cabecera">
          <div>
            <div className="numero">DENUNCIA N° {d.numero} · CÓDIGO {d.codigoSeguimiento}</div>
            <h1>{TIPOS_DELITO[d.tipo].nombre}</h1>
            <div className="chips">
              <InsigniaEstado estado={d.estado} />
              <SelectorPrioridad denuncia={d} />
              <span className="insignia insignia-gris sin-punto">{ORIGENES[d.origen]}</span>
              <span className="texto-suave texto-chico">Ingresó {haceCuanto(d.creadaEn)} · {fechaHora(d.creadaEn)}</span>
            </div>
          </div>
          <div className="acciones no-imprimir">
            {d.permisos.asignar && (
              <button className="btn btn-secundario" onClick={() => setModal('asignacion')}>
                <UserCheck /> {d.instructor ? 'Cambiar instructor' : 'Designar instructor'}
              </button>
            )}
            {d.permisos.derivar && (
              <button className="btn btn-secundario" onClick={() => setModal('derivacion')}><ArrowRightLeft /> Derivar</button>
            )}
            {d.estadosSiguientes.length > 0 && (
              <button className="btn btn-primario" onClick={() => setModal('estado')}>
                <RefreshCw /> {cerrada ? 'Reabrir' : 'Cambiar estado'}
              </button>
            )}
            <button className="btn btn-fantasma btn-icono" onClick={() => window.print()} title="Imprimir" aria-label="Imprimir"><Printer /></button>
          </div>
        </div>
      </section>

      <div className="grilla-detalle">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <section className="tarjeta">
            <div className="tarjeta-cabecera"><h2>El hecho</h2></div>
            <div className="tarjeta-cuerpo" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <dl className="datos">
                <div><dt>Fecha y hora</dt><dd>{fechaHora(d.fechaHecho)}</dd></div>
                <div><dt>Localidad</dt><dd>{d.localidad}</dd></div>
                <div className="ancho-completo"><dt>Lugar</dt><dd>{d.lugarHecho}</dd></div>
                {d.bienesInvolucrados && <div className="ancho-completo"><dt>Bienes involucrados</dt><dd>{d.bienesInvolucrados}</dd></div>}
              </dl>
              <div>
                <div className="campo-etiqueta" style={{ marginBottom: 6 }}>Relato del denunciante</div>
                <div className="relato-hecho">{d.relato}</div>
              </div>
              {d.latitud !== null && d.longitud !== null && (
                <div className="mini-mapa no-imprimir">
                  <MapContainer className="mapa" center={[d.latitud, d.longitud]} zoom={16} scrollWheelZoom={false} style={{ height: '100%', minHeight: 0, borderRadius: 0 }}>
                    <CapaBase />
                    <Marker position={[d.latitud, d.longitud]} icon={iconoHecho} />
                  </MapContainer>
                </div>
              )}
            </div>
          </section>

          <Adjuntos d={d} />
          <Actuaciones d={d} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <section className="tarjeta">
            <div className="tarjeta-cabecera"><h2>Denunciante</h2></div>
            <div className="tarjeta-cuerpo">
              <dl className="datos">
                <div className="ancho-completo"><dt>Apellido y nombre</dt><dd>{d.denunciante.apellido}, {d.denunciante.nombre}</dd></div>
                <div><dt>DNI</dt><dd>{formatearDni(d.denunciante.dni)}</dd></div>
                <div><dt>Nacimiento</dt><dd>{fechaSolo(d.denunciante.fechaNacimiento)}</dd></div>
                <div className="ancho-completo"><dt>Domicilio</dt><dd>{d.denunciante.domicilio}, {d.denunciante.localidad}</dd></div>
                <div className="ancho-completo">
                  <dt>Contacto</dt>
                  <dd style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {d.denunciante.telefono && <a href={`tel:${d.denunciante.telefono.replace(/[^\d]/g, '')}`}><Phone size={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> {d.denunciante.telefono}</a>}
                    {d.denunciante.email && <a href={`mailto:${d.denunciante.email}`}><Mail size={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> {d.denunciante.email}</a>}
                    {!d.denunciante.telefono && !d.denunciante.email && '—'}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="tarjeta">
            <div className="tarjeta-cabecera"><h2>Intervención</h2></div>
            <div className="tarjeta-cuerpo">
              <dl className="datos">
                <div className="ancho-completo"><dt>Dependencia</dt><dd>{d.dependencia?.nombre ?? 'Sin jurisdicción asignada'}</dd></div>
                <div className="ancho-completo">
                  <dt>Instructor</dt>
                  <dd>{d.instructor ? <>{JERARQUIAS[d.instructor.jerarquia]} {d.instructor.nombre} <span className="texto-suave">· Leg. {d.instructor.legajo}</span></> : <span className="texto-suave">Sin designar</span>}</dd>
                </div>
                <div><dt>Última actuación</dt><dd>{fechaHora(d.actualizadaEn)}</dd></div>
                <div><dt>Cierre</dt><dd>{fechaHora(d.cerradaEn)}</dd></div>
              </dl>
            </div>
          </section>

          {!d.denunciante.email && (
            <Aviso tipo="info">El denunciante no informó correo electrónico: los avisos de novedades no se envían automáticamente.</Aviso>
          )}
        </div>
      </div>

      {modal === 'estado' && <ModalEstado denuncia={d} onCerrar={() => setModal(null)} />}
      {modal === 'asignacion' && <ModalAsignacion denuncia={d} onCerrar={() => setModal(null)} />}
      {modal === 'derivacion' && <ModalDerivacion denuncia={d} onCerrar={() => setModal(null)} />}
    </>
  );
}

function SelectorPrioridad({ denuncia }: { denuncia: DenunciaDetalle }) {
  const queryClient = useQueryClient();
  const { notificar } = useNotificaciones();
  const cambio = useMutation({
    mutationFn: (prioridad: Prioridad) => api.post(`/denuncias/${denuncia.id}/prioridad`, { prioridad }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['denuncia', denuncia.id] });
      notificar('Prioridad actualizada', { tipo: 'exito' });
    },
    onError: (e) => notificar(mensajeDeError(e), { tipo: 'error' }),
  });

  if (!denuncia.permisos.asignar) return <EtiquetaPrioridad prioridad={denuncia.prioridad} />;
  return (
    <label className="etiqueta-prioridad" title="Cambiar prioridad">
      <i style={{ background: PRIORIDADES[denuncia.prioridad].color }} />
      <select className="seleccion" value={denuncia.prioridad} disabled={cambio.isPending}
        onChange={(e) => cambio.mutate(e.target.value as Prioridad)}
        style={{ height: 26, fontSize: 12.5, padding: '0 26px 0 8px', backgroundPosition: 'right 8px center', width: 'auto' }}>
        {Object.entries(PRIORIDADES).map(([k, v]) => <option key={k} value={k}>Prioridad {v.nombre.toLowerCase()}</option>)}
      </select>
    </label>
  );
}

function Adjuntos({ d }: { d: DenunciaDetalle }) {
  const entrada = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { notificar } = useNotificaciones();
  const subida = useMutation({
    mutationFn: (archivo: File) => {
      const f = new FormData();
      f.set('archivo', archivo);
      return api.post(`/denuncias/${d.id}/adjuntos`, f);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['denuncia', d.id] });
      notificar('Archivo incorporado', { tipo: 'exito' });
    },
    onError: (e) => notificar(mensajeDeError(e), { tipo: 'error' }),
  });

  return (
    <section className="tarjeta">
      <div className="tarjeta-cabecera">
        <h2>Archivos ({d.adjuntos.length})</h2>
        <button className="btn btn-secundario btn-sm no-imprimir" disabled={subida.isPending} onClick={() => entrada.current?.click()}>
          <Paperclip /> {subida.isPending ? 'Subiendo…' : 'Incorporar archivo'}
        </button>
        <input ref={entrada} type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(e) => { const a = e.target.files?.[0]; if (a) subida.mutate(a); e.target.value = ''; }} />
      </div>
      <div className="tarjeta-cuerpo">
        {d.adjuntos.length === 0 ? (
          <p className="texto-suave texto-chico">No hay archivos adjuntos.</p>
        ) : (
          <div className="galeria">
            {d.adjuntos.map((a) => {
              const url = api.url(`/denuncias/${d.id}/adjuntos/${a.id}`);
              return (
                <a key={a.id} href={url} target="_blank" rel="noreferrer" title={`${a.nombre} · ${tamanoArchivo(a.tamanoBytes)}`}>
                  {a.contentType.startsWith('image/') ? <img src={url} alt={a.nombre} loading="lazy" /> : <div className="archivo"><FileText /></div>}
                  <span>{a.nombre}</span>
                  <span className="texto-suave" style={{ paddingTop: 0 }}>{a.aportadoPorDenunciante ? 'Denunciante' : 'Personal'}</span>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function Actuaciones({ d }: { d: DenunciaDetalle }) {
  const [texto, setTexto] = useState('');
  const [informar, setInformar] = useState(false);
  const queryClient = useQueryClient();
  const { notificar } = useNotificaciones();
  const nota = useMutation({
    mutationFn: () => api.post(`/denuncias/${d.id}/notas`, { texto, informarAlDenunciante: informar }),
    onSuccess: () => {
      setTexto('');
      setInformar(false);
      void queryClient.invalidateQueries({ queryKey: ['denuncia', d.id] });
      notificar(informar ? 'Nota registrada e informada al denunciante' : 'Nota registrada', { tipo: 'exito' });
    },
  });

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (texto.trim()) nota.mutate();
  };

  return (
    <section className="tarjeta">
      <div className="tarjeta-cabecera"><h2>Actuaciones</h2><span className="texto-suave texto-chico">{d.actuaciones.length} registros</span></div>
      <form className="tarjeta-cuerpo no-imprimir" onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 10, borderBottom: '1px solid var(--gris-150)' }}>
        {nota.isError && <Aviso tipo="error">{mensajeDeError(nota.error)}</Aviso>}
        <textarea className="area" rows={3} style={{ minHeight: 80 }} placeholder="Registrar una diligencia, medida o novedad…"
          value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Nueva actuación" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <label className="casilla texto-chico">
            <input type="checkbox" checked={informar} onChange={(e) => setInformar(e.target.checked)} disabled={!d.denunciante.email} />
            <span>Informar al denunciante {d.denunciante.email ? '(se envía por correo y se ve en la consulta online)' : '(sin correo registrado)'}</span>
          </label>
          <button className="btn btn-primario btn-sm" disabled={!texto.trim() || nota.isPending}><Send /> Registrar</button>
        </div>
      </form>
      <div className="tarjeta-cuerpo">
        {d.actuaciones.length === 0 ? <Vacio titulo="Sin actuaciones" /> : (
          <ol className="linea-tiempo">
            {d.actuaciones.map((a, i) => <ItemActuacion key={a.id} a={a} destacado={i === 0} />)}
          </ol>
        )}
      </div>
    </section>
  );
}

const TITULO_ACTUACION: Record<Actuacion['tipo'], string> = {
  Registro: 'Registro de la denuncia',
  CambioEstado: 'Cambio de estado',
  Asignacion: 'Designación de instructor',
  Derivacion: 'Derivación',
  Nota: 'Actuación',
  Adjunto: 'Incorporación de archivo',
};

function ItemActuacion({ a, destacado }: { a: Actuacion; destacado: boolean }) {
  return (
    <li className={destacado ? 'destacado' : ''}>
      <div className="fecha">
        {fechaHora(a.fecha)} · <strong style={{ color: 'var(--gris-700)', fontWeight: 500 }}>{TITULO_ACTUACION[a.tipo]}</strong>
        {a.estadoNuevo && a.tipo === 'CambioEstado' && <> · {ESTADOS[a.estadoNuevo].nombre}</>}
      </div>
      <div className="texto">{a.descripcion}</div>
      <div className="meta" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <span>{a.usuario ?? 'Comisaría Virtual'}</span>
        {a.informadaAlDenunciante && <span className="marca-publica"><Mail aria-hidden /> Visible para el denunciante</span>}
      </div>
    </li>
  );
}
