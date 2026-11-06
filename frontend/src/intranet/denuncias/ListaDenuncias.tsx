import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Download, FilePlus2, Paperclip, Search, X } from 'lucide-react';
import { api } from '@/api/cliente';
import { ESTADOS, ORDEN_ESTADOS, ORDEN_TIPOS, ORIGENES, PRIORIDADES, TIPOS_DELITO } from '@/api/etiquetas';
import type { Dependencia, DenunciaItem, Pagina } from '@/api/tipos';
import { Cargando, EtiquetaPrioridad, InsigniaEstado, Paginacion, Vacio } from '@/componentes/ui';
import { fechaHora, formatearDni } from '@/lib/formato';
import { useSesion } from '../sesion/ContextoSesion';

const CLAVES = ['texto', 'estado', 'tipo', 'prioridad', 'origen', 'dependenciaId', 'desde', 'hasta', 'abiertas', 'sinInstructor', 'mias'] as const;

export default function ListaDenuncias() {
  const [params, setParams] = useSearchParams();
  const navegar = useNavigate();
  const { tieneRol } = useSesion();
  const esAdmin = tieneRol('Administrador');
  const [texto, setTexto] = useState(params.get('texto') ?? '');
  const pagina = Number(params.get('pagina') ?? 1);

  const filtro = Object.fromEntries(CLAVES.map((c) => [c, params.get(c) ?? undefined]));
  const consulta = {
    texto: filtro.texto,
    estado: filtro.estado,
    tipo: filtro.tipo,
    prioridad: filtro.prioridad,
    origen: filtro.origen,
    dependenciaId: filtro.dependenciaId,
    desde: filtro.desde,
    hasta: filtro.hasta,
    soloAbiertas: filtro.abiertas === '1',
    sinInstructor: filtro.sinInstructor === '1',
    mias: filtro.mias === '1',
    pagina,
    tamano: 20,
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['denuncias', consulta],
    queryFn: () => api.get<Pagina<DenunciaItem>>('/denuncias', consulta),
    placeholderData: keepPreviousData,
  });

  const { data: dependencias } = useQuery({
    queryKey: ['dependencias'],
    queryFn: () => api.get<Dependencia[]>('/dependencias'),
    enabled: esAdmin,
    staleTime: 5 * 60_000,
  });

  // Búsqueda con espera para no consultar en cada tecla.
  useEffect(() => {
    const t = window.setTimeout(() => {
      if ((params.get('texto') ?? '') !== texto) actualizar({ texto: texto || null });
    }, 400);
    return () => window.clearTimeout(t);
  }, [texto]);

  function actualizar(cambios: Record<string, string | null>, mantenerPagina = false) {
    const nuevos = new URLSearchParams(params);
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor === null || valor === '') nuevos.delete(clave);
      else nuevos.set(clave, valor);
    }
    if (!mantenerPagina) nuevos.delete('pagina');
    setParams(nuevos, { replace: true });
  }

  const alternar = (clave: string) => actualizar({ [clave]: params.get(clave) === '1' ? null : '1' });
  const hayFiltros = CLAVES.some((c) => params.get(c));

  const exportar = () => {
    window.location.href = api.url('/denuncias/exportar', { ...consulta, pagina: undefined, tamano: undefined });
  };

  return (
    <>
      <div className="cabecera-vista">
        <div>
          <h1>Denuncias</h1>
          <p>Registro de denuncias recibidas por la Comisaría Virtual y en forma presencial.</p>
        </div>
        <div className="acciones">
          <button className="btn btn-secundario" onClick={exportar}><Download /> Exportar CSV</button>
          <Link to="/intranet/denuncias/nueva" className="btn btn-primario"><FilePlus2 /> Denuncia presencial</Link>
        </div>
      </div>

      <section className="tarjeta">
        <div className="filtros">
          <div className="campo busqueda">
            <label htmlFor="buscar">Buscar</label>
            <div className="entrada-icono">
              <Search aria-hidden />
              <input id="buscar" className="entrada" placeholder="Número, DNI, apellido, lugar o código" value={texto} onChange={(e) => setTexto(e.target.value)} />
            </div>
          </div>
          <div className="campo">
            <label htmlFor="f-estado">Estado</label>
            <select id="f-estado" className="seleccion" value={params.get('estado') ?? ''} onChange={(e) => actualizar({ estado: e.target.value })}>
              <option value="">Todos</option>
              {ORDEN_ESTADOS.map((e) => <option key={e} value={e}>{ESTADOS[e].nombre}</option>)}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="f-tipo">Tipo de hecho</label>
            <select id="f-tipo" className="seleccion" value={params.get('tipo') ?? ''} onChange={(e) => actualizar({ tipo: e.target.value })}>
              <option value="">Todos</option>
              {ORDEN_TIPOS.map((t) => <option key={t} value={t}>{TIPOS_DELITO[t].nombre}</option>)}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="f-prioridad">Prioridad</label>
            <select id="f-prioridad" className="seleccion" value={params.get('prioridad') ?? ''} onChange={(e) => actualizar({ prioridad: e.target.value })}>
              <option value="">Todas</option>
              {Object.entries(PRIORIDADES).map(([k, v]) => <option key={k} value={k}>{v.nombre}</option>)}
            </select>
          </div>
          {esAdmin && (
            <div className="campo" style={{ minWidth: 200 }}>
              <label htmlFor="f-dependencia">Dependencia</label>
              <select id="f-dependencia" className="seleccion" value={params.get('dependenciaId') ?? ''} onChange={(e) => actualizar({ dependenciaId: e.target.value })}>
                <option value="">Todas</option>
                {dependencias?.filter((d) => d.recibeDenuncias).map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
              </select>
            </div>
          )}
          <div className="campo">
            <label htmlFor="f-desde">Desde</label>
            <input id="f-desde" type="date" className="entrada" value={params.get('desde') ?? ''} onChange={(e) => actualizar({ desde: e.target.value })} />
          </div>
          <div className="campo">
            <label htmlFor="f-hasta">Hasta</label>
            <input id="f-hasta" type="date" className="entrada" value={params.get('hasta') ?? ''} onChange={(e) => actualizar({ hasta: e.target.value })} />
          </div>
        </div>
        <div className="filtros-rapidos">
          <button className="chip" aria-pressed={params.get('abiertas') === '1'} onClick={() => alternar('abiertas')}>Solo abiertas</button>
          <button className="chip" aria-pressed={params.get('sinInstructor') === '1'} onClick={() => alternar('sinInstructor')}>Sin instructor</button>
          <button className="chip" aria-pressed={params.get('mias') === '1'} onClick={() => alternar('mias')}>A mi cargo</button>
          <button className="chip" aria-pressed={params.get('origen') === 'Web'} onClick={() => actualizar({ origen: params.get('origen') === 'Web' ? null : 'Web' })}>Comisaría Virtual</button>
          {hayFiltros && (
            <button className="btn btn-fantasma btn-sm" style={{ marginLeft: 'auto' }} onClick={() => { setTexto(''); setParams({}, { replace: true }); }}>
              <X /> Limpiar filtros
            </button>
          )}
        </div>

        {isLoading ? <Cargando /> : !data || data.items.length === 0 ? (
          <Vacio titulo="No hay denuncias con esos criterios" texto="Probá ajustando los filtros de búsqueda." />
        ) : (
          <div className="tabla-contenedor" style={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity .15s' }}>
            <table className="tabla">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Tipo / lugar</th>
                  <th>Denunciante</th>
                  <th>Dependencia / instructor</th>
                  <th>Prioridad</th>
                  <th>Estado</th>
                  <th className="derecha">Ingreso</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((d) => (
                  <tr key={d.id} className="clicable" onClick={() => navegar(`/intranet/denuncias/${d.id}`)}>
                    <td>
                      <span className="mono celda-principal">{d.numero}</span>
                      <span className="celda-secundaria">{ORIGENES[d.origen]}</span>
                    </td>
                    <td style={{ maxWidth: 260 }}>
                      <span className="celda-principal">{TIPOS_DELITO[d.tipo].nombre}</span>
                      <span className="celda-secundaria" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.lugarHecho}, {d.localidad}</span>
                    </td>
                    <td>
                      {d.denunciante}
                      <span className="celda-secundaria">DNI {formatearDni(d.dni)}</span>
                    </td>
                    <td>
                      {d.dependencia ?? '—'}
                      <span className="celda-secundaria">{d.instructor ?? 'Sin instructor'}</span>
                    </td>
                    <td><EtiquetaPrioridad prioridad={d.prioridad} /></td>
                    <td><InsigniaEstado estado={d.estado} /></td>
                    <td className="derecha nowrap texto-suave">{fechaHora(d.creadaEn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && (
          <Paginacion pagina={data.numero} totalPaginas={data.totalPaginas} total={data.total} nombre="denuncias"
            onCambiar={(p) => actualizar({ pagina: String(p) }, true)} />
        )}
      </section>
      <p className="texto-chico texto-suave" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Paperclip size={13} /> La exportación respeta los filtros aplicados (hasta 10.000 registros) y queda registrada en la auditoría.
      </p>
    </>
  );
}
