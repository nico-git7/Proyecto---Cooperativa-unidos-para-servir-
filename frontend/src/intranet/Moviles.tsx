import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Search } from 'lucide-react';
import { api, ErrorApi, mensajeDeError } from '@/api/cliente';
import { ESTADOS_MOVIL, TIPOS_MOVIL } from '@/api/etiquetas';
import type { Dependencia, EstadoMovil, Movil, TipoMovil } from '@/api/tipos';
import { useNotificaciones } from '@/componentes/Notificaciones';
import { Aviso, Campo, Cargando, Insignia, Modal, Vacio } from '@/componentes/ui';
import { numero } from '@/lib/formato';
import { useSesion } from './sesion/ContextoSesion';

export default function Moviles() {
  const { tieneRol } = useSesion();
  const esAdmin = tieneRol('Administrador');
  const puedeEditar = tieneRol('Administrador', 'JefeDependencia');
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState<EstadoMovil | ''>('');
  const [dependenciaId, setDependenciaId] = useState('');
  const [editando, setEditando] = useState<Movil | 'nuevo' | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['moviles', dependenciaId], queryFn: () => api.get<Movil[]>('/moviles', { dependenciaId }) });
  const { data: dependencias } = useQuery({ queryKey: ['dependencias'], queryFn: () => api.get<Dependencia[]>('/dependencias'), staleTime: 5 * 60_000 });

  const resumen = useMemo(() => {
    const r: Record<string, number> = {};
    for (const m of data ?? []) r[m.estado] = (r[m.estado] ?? 0) + 1;
    return r;
  }, [data]);

  const filtrados = useMemo(() => {
    const t = texto.trim().toUpperCase();
    return (data ?? []).filter((m) => (!estado || m.estado === estado) &&
      (!t || `${m.dominio} ${m.numeroInterno} ${m.marca} ${m.modelo} ${m.dependencia}`.toUpperCase().includes(t)));
  }, [data, texto, estado]);

  return (
    <>
      <div className="cabecera-vista">
        <div>
          <h1>Móviles</h1>
          <p>Parque automotor por dependencia y estado operativo.</p>
        </div>
        {puedeEditar && <div className="acciones"><button className="btn btn-primario" onClick={() => setEditando('nuevo')}><Plus /> Nuevo móvil</button></div>}
      </div>

      <div className="indicadores" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        {(Object.keys(ESTADOS_MOVIL) as EstadoMovil[]).map((e) => (
          <button key={e} className={`tarjeta indicador ${e === 'FueraDeServicio' && resumen[e] ? 'alerta' : e === 'EnTaller' ? 'neutro' : ''}`}
            style={{ textAlign: 'left', cursor: 'pointer', border: estado === e ? '1px solid var(--azul-900)' : undefined }}
            onClick={() => setEstado(estado === e ? '' : e)}>
            <span className="rotulo">{ESTADOS_MOVIL[e].nombre}</span>
            <span className="valor">{numero(resumen[e] ?? 0)}</span>
          </button>
        ))}
      </div>

      <section className="tarjeta">
        <div className="filtros">
          <div className="campo busqueda">
            <label htmlFor="b-movil">Buscar</label>
            <div className="entrada-icono"><Search aria-hidden />
              <input id="b-movil" className="entrada" placeholder="Dominio, número interno, modelo" value={texto} onChange={(e) => setTexto(e.target.value)} />
            </div>
          </div>
          {esAdmin && (
            <div className="campo" style={{ minWidth: 220 }}>
              <label htmlFor="m-dep">Dependencia</label>
              <select id="m-dep" className="seleccion" value={dependenciaId} onChange={(e) => setDependenciaId(e.target.value)}>
                <option value="">Todas</option>
                {dependencias?.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
              </select>
            </div>
          )}
        </div>
        {isLoading ? <Cargando /> : filtrados.length === 0 ? <Vacio titulo="Sin móviles para mostrar" /> : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead><tr><th>Interno</th><th>Dominio</th><th>Vehículo</th><th>Dependencia</th><th className="derecha">Kilometraje</th><th>Estado</th>{puedeEditar && <th />}</tr></thead>
              <tbody>
                {filtrados.map((m) => (
                  <tr key={m.id}>
                    <td className="mono celda-principal">{m.numeroInterno}</td>
                    <td className="mono">{m.dominio}</td>
                    <td>{m.marca} {m.modelo}<span className="celda-secundaria">{TIPOS_MOVIL[m.tipo]} · {m.anio}</span></td>
                    <td>{m.dependencia}</td>
                    <td className="derecha">{numero(m.kilometraje)} km</td>
                    <td><Insignia tono={ESTADOS_MOVIL[m.estado].tono}>{ESTADOS_MOVIL[m.estado].nombre}</Insignia>
                      {m.observaciones && <span className="celda-secundaria">{m.observaciones}</span>}</td>
                    {puedeEditar && <td className="derecha"><button className="btn btn-fantasma btn-sm" onClick={() => setEditando(m)}><Pencil /> Editar</button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editando && <FormularioMovil movil={editando === 'nuevo' ? null : editando} dependencias={dependencias ?? []} onCerrar={() => setEditando(null)} />}
    </>
  );
}

function FormularioMovil({ movil, dependencias, onCerrar }: { movil: Movil | null; dependencias: Dependencia[]; onCerrar: () => void }) {
  const { sesion, tieneRol } = useSesion();
  const esAdmin = tieneRol('Administrador');
  const [f, setF] = useState({
    numeroInterno: movil?.numeroInterno ?? '',
    dominio: movil?.dominio ?? '',
    tipo: (movil?.tipo ?? 'Camioneta') as TipoMovil,
    marca: movil?.marca ?? '',
    modelo: movil?.modelo ?? '',
    anio: String(movil?.anio ?? new Date().getFullYear()),
    estado: (movil?.estado ?? 'Operativo') as EstadoMovil,
    dependenciaId: String(movil?.dependenciaId ?? sesion?.dependencia.id ?? ''),
    kilometraje: String(movil?.kilometraje ?? 0),
    observaciones: movil?.observaciones ?? '',
  });
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  const queryClient = useQueryClient();
  const { notificar } = useNotificaciones();
  const guardar = useMutation({
    mutationFn: () => {
      const cuerpo = { ...f, anio: Number(f.anio), kilometraje: Number(f.kilometraje), dependenciaId: Number(f.dependenciaId), observaciones: f.observaciones || null };
      return movil ? api.put(`/moviles/${movil.id}`, cuerpo) : api.post('/moviles', cuerpo);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['moviles'] });
      notificar(movil ? 'Móvil actualizado' : 'Móvil registrado', { tipo: 'exito', texto: f.dominio.toUpperCase() });
      onCerrar();
    },
  });
  const err = (c: string) => (guardar.error instanceof ErrorApi ? guardar.error.campo(c) : undefined);

  return (
    <Modal titulo={movil ? `Móvil ${movil.numeroInterno}` : 'Nuevo móvil'} onCerrar={onCerrar} ancho pie={
      <>
        <button className="btn btn-secundario" onClick={onCerrar}>Cancelar</button>
        <button className="btn btn-primario" disabled={guardar.isPending} onClick={() => guardar.mutate()}>{guardar.isPending ? 'Guardando…' : 'Guardar'}</button>
      </>
    }>
      {guardar.isError && <Aviso tipo="error">{mensajeDeError(guardar.error)}</Aviso>}
      <div className="grilla-form grilla-form-3">
        <Campo etiqueta="Número interno" requerido error={err('numeroInterno')}>{(id) => <input id={id} className="entrada mono" value={f.numeroInterno} onChange={(e) => set('numeroInterno', e.target.value)} placeholder="M-1234" />}</Campo>
        <Campo etiqueta="Dominio" requerido error={err('dominio')}>{(id) => <input id={id} className="entrada mono" value={f.dominio} onChange={(e) => set('dominio', e.target.value.toUpperCase())} placeholder="AB123CD" />}</Campo>
        <Campo etiqueta="Tipo" requerido>{(id) => <select id={id} className="seleccion" value={f.tipo} onChange={(e) => set('tipo', e.target.value)}>
          {Object.entries(TIPOS_MOVIL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>}</Campo>
        <Campo etiqueta="Marca" requerido error={err('marca')}>{(id) => <input id={id} className="entrada" value={f.marca} onChange={(e) => set('marca', e.target.value)} />}</Campo>
        <Campo etiqueta="Modelo" requerido error={err('modelo')}>{(id) => <input id={id} className="entrada" value={f.modelo} onChange={(e) => set('modelo', e.target.value)} />}</Campo>
        <Campo etiqueta="Año" requerido error={err('anio')}>{(id) => <input id={id} className="entrada" type="number" value={f.anio} onChange={(e) => set('anio', e.target.value)} />}</Campo>
        <Campo etiqueta="Estado" requerido>{(id) => <select id={id} className="seleccion" value={f.estado} onChange={(e) => set('estado', e.target.value)}>
          {Object.entries(ESTADOS_MOVIL).map(([k, v]) => <option key={k} value={k}>{v.nombre}</option>)}</select>}</Campo>
        <Campo etiqueta="Kilometraje" error={err('kilometraje')}>{(id) => <input id={id} className="entrada" type="number" value={f.kilometraje} onChange={(e) => set('kilometraje', e.target.value)} />}</Campo>
        <Campo etiqueta="Dependencia" requerido>{(id) => <select id={id} className="seleccion" value={f.dependenciaId} disabled={!esAdmin} onChange={(e) => set('dependenciaId', e.target.value)}>
          {dependencias.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
          </select>}</Campo>
        <Campo etiqueta="Observaciones" className="ancho-completo">{(id) => <textarea id={id} className="area" rows={2} style={{ minHeight: 64 }} value={f.observaciones} onChange={(e) => set('observaciones', e.target.value)} />}</Campo>
      </div>
    </Modal>
  );
}
