import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Search, UserPlus } from 'lucide-react';
import { api, ErrorApi, mensajeDeError } from '@/api/cliente';
import { JERARQUIAS, ROLES, SITUACIONES } from '@/api/etiquetas';
import type { Dependencia, Jerarquia, Pagina, PersonalItem, SituacionRevista } from '@/api/tipos';
import { useNotificaciones } from '@/componentes/Notificaciones';
import { Aviso, Campo, Cargando, Insignia, Modal, Paginacion, Vacio } from '@/componentes/ui';
import { fechaSolo, formatearDni } from '@/lib/formato';
import { useSesion } from './sesion/ContextoSesion';

const JERARQUIAS_ORDEN = Object.keys(JERARQUIAS) as Jerarquia[];

export default function Personal() {
  const { tieneRol } = useSesion();
  const esAdmin = tieneRol('Administrador');
  const puedeEditar = tieneRol('Administrador', 'JefeDependencia');
  const [texto, setTexto] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [dependenciaId, setDependenciaId] = useState('');
  const [situacion, setSituacion] = useState('');
  const [pagina, setPagina] = useState(1);
  const [editando, setEditando] = useState<PersonalItem | 'nuevo' | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => { setBusqueda(texto); setPagina(1); }, 350);
    return () => window.clearTimeout(t);
  }, [texto]);

  const consulta = { texto: busqueda, dependenciaId, situacion, pagina, tamano: 25 };
  const { data, isLoading } = useQuery({
    queryKey: ['personal', consulta],
    queryFn: () => api.get<Pagina<PersonalItem>>('/personal', consulta),
    placeholderData: keepPreviousData,
  });
  const { data: dependencias } = useQuery({ queryKey: ['dependencias'], queryFn: () => api.get<Dependencia[]>('/dependencias'), staleTime: 5 * 60_000 });

  return (
    <>
      <div className="cabecera-vista">
        <div>
          <h1>Personal</h1>
          <p>Efectivos por dependencia, jerarquía y situación de revista.</p>
        </div>
        {puedeEditar && <div className="acciones"><button className="btn btn-primario" onClick={() => setEditando('nuevo')}><UserPlus /> Nuevo efectivo</button></div>}
      </div>

      <section className="tarjeta">
        <div className="filtros">
          <div className="campo busqueda">
            <label htmlFor="b-personal">Buscar</label>
            <div className="entrada-icono"><Search aria-hidden />
              <input id="b-personal" className="entrada" placeholder="Apellido, nombre, legajo o DNI" value={texto} onChange={(e) => setTexto(e.target.value)} />
            </div>
          </div>
          {esAdmin && (
            <div className="campo" style={{ minWidth: 220 }}>
              <label htmlFor="p-dep">Dependencia</label>
              <select id="p-dep" className="seleccion" value={dependenciaId} onChange={(e) => { setDependenciaId(e.target.value); setPagina(1); }}>
                <option value="">Todas</option>
                {dependencias?.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
              </select>
            </div>
          )}
          <div className="campo">
            <label htmlFor="p-sit">Situación</label>
            <select id="p-sit" className="seleccion" value={situacion} onChange={(e) => { setSituacion(e.target.value); setPagina(1); }}>
              <option value="">Todas</option>
              {Object.entries(SITUACIONES).map(([k, v]) => <option key={k} value={k}>{v.nombre}</option>)}
            </select>
          </div>
        </div>
        {isLoading ? <Cargando /> : !data?.items.length ? <Vacio titulo="Sin resultados" /> : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead><tr><th>Legajo</th><th>Apellido y nombre</th><th>Jerarquía</th><th>Dependencia</th><th>Situación</th><th>Acceso</th>{puedeEditar && <th />}</tr></thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.id}>
                    <td className="mono">{p.legajo}</td>
                    <td><span className="celda-principal">{p.apellido}, {p.nombre}</span><span className="celda-secundaria">DNI {formatearDni(p.dni)}</span></td>
                    <td>{JERARQUIAS[p.jerarquia]}</td>
                    <td>{p.dependencia}</td>
                    <td><Insignia tono={SITUACIONES[p.situacion].tono}>{SITUACIONES[p.situacion].nombre}</Insignia></td>
                    <td className="texto-suave">{p.rol ? ROLES[p.rol] : '—'}</td>
                    {puedeEditar && <td className="derecha"><button className="btn btn-fantasma btn-sm" onClick={() => setEditando(p)}><Pencil /> Editar</button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Paginacion pagina={data.numero} totalPaginas={data.totalPaginas} total={data.total} nombre="efectivos" onCambiar={setPagina} />}
      </section>

      {editando && <FormularioPersonal efectivo={editando === 'nuevo' ? null : editando} dependencias={dependencias ?? []} onCerrar={() => setEditando(null)} />}
    </>
  );
}

function FormularioPersonal({ efectivo, dependencias, onCerrar }: { efectivo: PersonalItem | null; dependencias: Dependencia[]; onCerrar: () => void }) {
  const { sesion, tieneRol } = useSesion();
  const esAdmin = tieneRol('Administrador');
  const [f, setF] = useState({
    legajo: efectivo?.legajo ?? '',
    apellido: efectivo?.apellido ?? '',
    nombre: efectivo?.nombre ?? '',
    dni: efectivo?.dni ?? '',
    jerarquia: (efectivo?.jerarquia ?? 'Agente') as Jerarquia,
    situacion: (efectivo?.situacion ?? 'ServicioEfectivo') as SituacionRevista,
    dependenciaId: String(efectivo?.dependenciaId ?? sesion?.dependencia.id ?? ''),
    email: efectivo?.email ?? '',
    telefono: efectivo?.telefono ?? '',
    fechaIngreso: efectivo?.fechaIngreso ?? new Date().toISOString().slice(0, 10),
  });
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  const queryClient = useQueryClient();
  const { notificar } = useNotificaciones();

  const guardar = useMutation({
    mutationFn: () => {
      const cuerpo = { ...f, dependenciaId: Number(f.dependenciaId), email: f.email || null, telefono: f.telefono || null };
      return efectivo ? api.put(`/personal/${efectivo.id}`, cuerpo) : api.post('/personal', cuerpo);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['personal'] });
      notificar(efectivo ? 'Datos actualizados' : 'Efectivo registrado', { tipo: 'exito', texto: `${f.apellido}, ${f.nombre}` });
      onCerrar();
    },
  });
  const err = (c: string) => (guardar.error instanceof ErrorApi ? guardar.error.campo(c) : undefined);

  return (
    <Modal titulo={efectivo ? 'Editar efectivo' : 'Nuevo efectivo'} onCerrar={onCerrar} ancho pie={
      <>
        <button className="btn btn-secundario" onClick={onCerrar}>Cancelar</button>
        <button className="btn btn-primario" disabled={guardar.isPending} onClick={() => guardar.mutate()}>{guardar.isPending ? 'Guardando…' : 'Guardar'}</button>
      </>
    }>
      {guardar.isError && <Aviso tipo="error">{mensajeDeError(guardar.error)}</Aviso>}
      <div className="grilla-form grilla-form-3">
        <Campo etiqueta="Legajo" requerido error={err('legajo')}>{(id) => <input id={id} className="entrada mono" value={f.legajo} onChange={(e) => set('legajo', e.target.value.replace(/\D/g, ''))} />}</Campo>
        <Campo etiqueta="Apellido" requerido error={err('apellido')}>{(id) => <input id={id} className="entrada" value={f.apellido} onChange={(e) => set('apellido', e.target.value)} />}</Campo>
        <Campo etiqueta="Nombres" requerido error={err('nombre')}>{(id) => <input id={id} className="entrada" value={f.nombre} onChange={(e) => set('nombre', e.target.value)} />}</Campo>
        <Campo etiqueta="DNI" requerido error={err('dni')}>{(id) => <input id={id} className="entrada" inputMode="numeric" value={f.dni} onChange={(e) => set('dni', e.target.value.replace(/\D/g, ''))} />}</Campo>
        <Campo etiqueta="Jerarquía" requerido>
          {(id) => <select id={id} className="seleccion" value={f.jerarquia} onChange={(e) => set('jerarquia', e.target.value)}>
            {JERARQUIAS_ORDEN.map((j) => <option key={j} value={j}>{JERARQUIAS[j]}</option>)}
          </select>}
        </Campo>
        <Campo etiqueta="Situación de revista" requerido>
          {(id) => <select id={id} className="seleccion" value={f.situacion} onChange={(e) => set('situacion', e.target.value)}>
            {Object.entries(SITUACIONES).map(([k, v]) => <option key={k} value={k}>{v.nombre}</option>)}
          </select>}
        </Campo>
        <Campo etiqueta="Dependencia" requerido className="ancho-completo">
          {(id) => <select id={id} className="seleccion" value={f.dependenciaId} disabled={!esAdmin} onChange={(e) => set('dependenciaId', e.target.value)}>
            {dependencias.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
          </select>}
        </Campo>
        <Campo etiqueta="Correo electrónico" error={err('email')}>{(id) => <input id={id} className="entrada" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} />}</Campo>
        <Campo etiqueta="Teléfono">{(id) => <input id={id} className="entrada" value={f.telefono} onChange={(e) => set('telefono', e.target.value)} />}</Campo>
        <Campo etiqueta="Fecha de ingreso" requerido>{(id) => <input id={id} className="entrada" type="date" value={f.fechaIngreso} onChange={(e) => set('fechaIngreso', e.target.value)} />}</Campo>
      </div>
      {efectivo && <p className="texto-chico texto-suave">Ingreso registrado: {fechaSolo(efectivo.fechaIngreso)}. Los cambios quedan asentados en la auditoría.</p>}
    </Modal>
  );
}
