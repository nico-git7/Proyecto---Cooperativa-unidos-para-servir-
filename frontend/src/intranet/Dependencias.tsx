import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Search } from 'lucide-react';
import { api, ErrorApi, mensajeDeError } from '@/api/cliente';
import { TIPOS_DEPENDENCIA } from '@/api/etiquetas';
import type { Dependencia, TipoDependencia, UnidadRegional } from '@/api/tipos';
import { SelectorUbicacion } from '@/componentes/Mapa';
import { useNotificaciones } from '@/componentes/Notificaciones';
import { Aviso, Campo, Cargando, Insignia, Modal, Vacio } from '@/componentes/ui';
import { useSesion } from './sesion/ContextoSesion';

export default function Dependencias() {
  const { tieneRol } = useSesion();
  const esAdmin = tieneRol('Administrador');
  const [texto, setTexto] = useState('');
  const [unidad, setUnidad] = useState('');
  const [editando, setEditando] = useState<Dependencia | 'nueva' | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['dependencias', 'todas'],
    queryFn: () => api.get<Dependencia[]>('/dependencias', { incluirInactivas: true }),
  });
  const { data: unidades } = useQuery({ queryKey: ['unidades'], queryFn: () => api.get<UnidadRegional[]>('/dependencias/unidades-regionales'), staleTime: Infinity });

  const filtradas = useMemo(() => {
    const t = texto.trim().toLowerCase();
    return (data ?? []).filter((d) => (!unidad || String(d.unidadRegionalId) === unidad) &&
      (!t || `${d.nombre} ${d.localidad} ${d.direccion}`.toLowerCase().includes(t)));
  }, [data, texto, unidad]);

  return (
    <>
      <div className="cabecera-vista">
        <div>
          <h1>Dependencias</h1>
          <p>Comisarías, subcomisarías y direcciones agrupadas por unidad regional.</p>
        </div>
        {esAdmin && <div className="acciones"><button className="btn btn-primario" onClick={() => setEditando('nueva')}><Plus /> Nueva dependencia</button></div>}
      </div>
      <section className="tarjeta">
        <div className="filtros">
          <div className="campo busqueda">
            <label htmlFor="b-dep">Buscar</label>
            <div className="entrada-icono"><Search aria-hidden />
              <input id="b-dep" className="entrada" placeholder="Nombre, localidad o dirección" value={texto} onChange={(e) => setTexto(e.target.value)} />
            </div>
          </div>
          <div className="campo" style={{ minWidth: 220 }}>
            <label htmlFor="d-ur">Unidad regional</label>
            <select id="d-ur" className="seleccion" value={unidad} onChange={(e) => setUnidad(e.target.value)}>
              <option value="">Todas</option>
              {unidades?.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
          </div>
        </div>
        {isLoading ? <Cargando /> : filtradas.length === 0 ? <Vacio titulo="Sin resultados" /> : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead><tr><th>Dependencia</th><th>Unidad regional</th><th>Dirección</th><th>Teléfono</th><th className="derecha">Personal</th><th className="derecha">Móviles</th><th className="derecha">Abiertas</th>{esAdmin && <th />}</tr></thead>
              <tbody>
                {filtradas.map((d) => (
                  <tr key={d.id} style={{ opacity: d.activa ? 1 : 0.55 }}>
                    <td>
                      <span className="celda-principal">{d.nombre}</span>
                      <span className="celda-secundaria">{TIPOS_DEPENDENCIA[d.tipo]}{!d.recibeDenuncias && ' · no recibe denuncias'}{!d.activa && ' · inactiva'}</span>
                    </td>
                    <td>{d.unidadRegional}</td>
                    <td>{d.direccion}<span className="celda-secundaria">{d.localidad}</span></td>
                    <td className="nowrap">{d.telefono ?? '—'}</td>
                    <td className="derecha">{d.personal}</td>
                    <td className="derecha">{d.moviles}</td>
                    <td className="derecha">{d.denunciasAbiertas > 0 ? <Insignia tono="azul" sinPunto>{d.denunciasAbiertas}</Insignia> : '0'}</td>
                    {esAdmin && <td className="derecha"><button className="btn btn-fantasma btn-sm" onClick={() => setEditando(d)}><Pencil /> Editar</button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {editando && <FormularioDependencia dependencia={editando === 'nueva' ? null : editando} unidades={unidades ?? []} onCerrar={() => setEditando(null)} />}
    </>
  );
}

function FormularioDependencia({ dependencia, unidades, onCerrar }: { dependencia: Dependencia | null; unidades: UnidadRegional[]; onCerrar: () => void }) {
  const [f, setF] = useState({
    nombre: dependencia?.nombre ?? '',
    tipo: (dependencia?.tipo ?? 'Comisaria') as TipoDependencia,
    unidadRegionalId: String(dependencia?.unidadRegionalId ?? unidades[0]?.id ?? ''),
    direccion: dependencia?.direccion ?? '',
    localidad: dependencia?.localidad ?? '',
    telefono: dependencia?.telefono ?? '',
    email: dependencia?.email ?? '',
    recibeDenuncias: dependencia?.recibeDenuncias ?? true,
    activa: dependencia?.activa ?? true,
  });
  const [ubicacion, setUbicacion] = useState<[number, number] | null>(
    dependencia?.latitud && dependencia.longitud ? [dependencia.latitud, dependencia.longitud] : null);
  const queryClient = useQueryClient();
  const { notificar } = useNotificaciones();

  const guardar = useMutation({
    mutationFn: () => {
      const cuerpo = {
        ...f, unidadRegionalId: Number(f.unidadRegionalId), telefono: f.telefono || null, email: f.email || null,
        latitud: ubicacion?.[0] ?? null, longitud: ubicacion?.[1] ?? null,
      };
      return dependencia ? api.put(`/dependencias/${dependencia.id}`, cuerpo) : api.post('/dependencias', cuerpo);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dependencias'] });
      void queryClient.invalidateQueries({ queryKey: ['publico', 'dependencias'] });
      notificar('Dependencia guardada', { tipo: 'exito', texto: f.nombre });
      onCerrar();
    },
  });
  const err = (c: string) => (guardar.error instanceof ErrorApi ? guardar.error.campo(c) : undefined);

  return (
    <Modal titulo={dependencia ? 'Editar dependencia' : 'Nueva dependencia'} onCerrar={onCerrar} ancho pie={
      <>
        <button className="btn btn-secundario" onClick={onCerrar}>Cancelar</button>
        <button className="btn btn-primario" disabled={guardar.isPending} onClick={() => guardar.mutate()}>{guardar.isPending ? 'Guardando…' : 'Guardar'}</button>
      </>
    }>
      {guardar.isError && <Aviso tipo="error">{mensajeDeError(guardar.error)}</Aviso>}
      <div className="grilla-form grilla-form-3">
        <Campo etiqueta="Nombre" requerido error={err('nombre')} className="ancho-completo">{(id) => <input id={id} className="entrada" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} />}</Campo>
        <Campo etiqueta="Tipo" requerido>{(id) => <select id={id} className="seleccion" value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value as TipoDependencia })}>
          {Object.entries(TIPOS_DEPENDENCIA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>}</Campo>
        <Campo etiqueta="Unidad regional" requerido>{(id) => <select id={id} className="seleccion" value={f.unidadRegionalId} onChange={(e) => setF({ ...f, unidadRegionalId: e.target.value })}>
          {unidades.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}</select>}</Campo>
        <Campo etiqueta="Localidad" requerido error={err('localidad')}>{(id) => <input id={id} className="entrada" value={f.localidad} onChange={(e) => setF({ ...f, localidad: e.target.value })} />}</Campo>
        <Campo etiqueta="Dirección" requerido error={err('direccion')}>{(id) => <input id={id} className="entrada" value={f.direccion} onChange={(e) => setF({ ...f, direccion: e.target.value })} />}</Campo>
        <Campo etiqueta="Teléfono">{(id) => <input id={id} className="entrada" value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} />}</Campo>
        <Campo etiqueta="Correo para avisos" error={err('email')} ayuda="Recibe un aviso por cada denuncia nueva.">{(id, d) => <input id={id} aria-describedby={d} className="entrada" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />}</Campo>
      </div>
      <div className="campo">
        <span className="campo-etiqueta">Ubicación (se usa para asignar la jurisdicción de las denuncias)</span>
        <div className="selector-mapa" style={{ height: 240 }}>
          <SelectorUbicacion valor={ubicacion} onCambiar={(lat, lng) => setUbicacion([lat, lng])} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <label className="casilla"><input type="checkbox" checked={f.recibeDenuncias} onChange={(e) => setF({ ...f, recibeDenuncias: e.target.checked })} /> Recibe denuncias por jurisdicción</label>
        <label className="casilla"><input type="checkbox" checked={f.activa} onChange={(e) => setF({ ...f, activa: e.target.checked })} /> Activa</label>
      </div>
    </Modal>
  );
}
