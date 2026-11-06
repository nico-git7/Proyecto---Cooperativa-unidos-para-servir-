import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ArrowRight, Clock, FileText, Globe, Inbox, Timer, UserX } from 'lucide-react';
import { api } from '@/api/cliente';
import { COLOR_SERIE, ESTADOS, nombreTipo, ORIGENES } from '@/api/etiquetas';
import type { EstadoDenuncia, Panel as DatosPanel, TipoDelito } from '@/api/tipos';
import { Cargando, EtiquetaPrioridad, InsigniaEstado, Vacio } from '@/componentes/ui';
import { diaCorto, fechaSolo, haceCuanto, numero } from '@/lib/formato';
import { useSesion } from './sesion/ContextoSesion';

const PERIODOS = [7, 30, 90];

export default function Panel() {
  const [dias, setDias] = useState(30);
  const { sesion } = useSesion();
  const navegar = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['panel', dias],
    queryFn: () => api.get<DatosPanel>('/estadisticas/panel', { dias }),
    refetchInterval: 60_000,
  });

  return (
    <>
      <div className="cabecera-vista">
        <div>
          <h1>Panel operativo</h1>
          <p>{data?.alcance ?? sesion?.dependencia.nombre} · últimos {dias} días</p>
        </div>
        <div className="acciones" role="group" aria-label="Período">
          {PERIODOS.map((p) => (
            <button key={p} className="chip" aria-pressed={dias === p} onClick={() => setDias(p)}>{p} días</button>
          ))}
        </div>
      </div>

      {isLoading || !data ? <Cargando /> : (
        <>
          <Indicadores d={data} />

          <div className="grilla-panel">
            <section className="tarjeta">
              <div className="tarjeta-cabecera">
                <h2>Denuncias recibidas y cerradas por día</h2>
                <div className="leyenda-grafico">
                  <span><i style={{ background: COLOR_SERIE.recibidas }} /> Recibidas</span>
                  <span><i style={{ background: COLOR_SERIE.cerradas }} /> Cerradas</span>
                </div>
              </div>
              <div className="tarjeta-cuerpo" style={{ height: 300, paddingLeft: 4 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.serie} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="relleno-recibidas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLOR_SERIE.recibidas} stopOpacity={0.18} />
                        <stop offset="100%" stopColor={COLOR_SERIE.recibidas} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="var(--gris-150)" />
                    <XAxis dataKey="fecha" tickFormatter={diaCorto} tick={{ fontSize: 12, fill: 'var(--gris-500)' }} tickLine={false}
                      axisLine={{ stroke: 'var(--gris-200)' }} minTickGap={24} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--gris-500)' }} tickLine={false} axisLine={false} width={44} />
                    <Tooltip
                      cursor={{ stroke: 'var(--gris-400)', strokeWidth: 1 }}
                      content={({ active, payload, label }) => active && payload?.length ? (
                        <div className="tooltip-grafico">
                          <b>{fechaSolo(String(label))}</b>
                          <div>Recibidas: <strong>{payload.find((p) => p.dataKey === 'recibidas')?.value}</strong></div>
                          <div>Cerradas: <strong>{payload.find((p) => p.dataKey === 'cerradas')?.value}</strong></div>
                        </div>
                      ) : null}
                    />
                    <Area type="monotone" dataKey="recibidas" stroke={COLOR_SERIE.recibidas} strokeWidth={2} fill="url(#relleno-recibidas)"
                      activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2 }} />
                    <Area type="monotone" dataKey="cerradas" stroke={COLOR_SERIE.cerradas} strokeWidth={2} fill="transparent"
                      activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="tarjeta">
              <div className="tarjeta-cabecera"><h2>Por tipo de hecho</h2></div>
              <div className="tarjeta-cuerpo">
                <BarrasHorizontales
                  items={data.porTipo.map((t) => ({ nombre: nombreTipo(t.clave as TipoDelito), cantidad: t.cantidad, clave: t.clave }))}
                  onElegir={(clave) => navegar(`/intranet/denuncias?tipo=${clave}`)}
                />
              </div>
            </section>
          </div>

          <div className="grilla-panel-3">
            <section className="tarjeta">
              <div className="tarjeta-cabecera"><h2>Abiertas por estado</h2></div>
              <div className="tarjeta-cuerpo">
                <BarrasHorizontales
                  items={data.porEstado
                    .slice()
                    .sort((a, b) => Object.keys(ESTADOS).indexOf(a.clave) - Object.keys(ESTADOS).indexOf(b.clave))
                    .map((e) => ({ nombre: ESTADOS[e.clave as EstadoDenuncia].nombre, cantidad: e.cantidad, clave: e.clave }))}
                  onElegir={(clave) => navegar(`/intranet/denuncias?estado=${clave}`)}
                />
              </div>
            </section>

            <section className="tarjeta">
              <div className="tarjeta-cabecera"><h2>Franja horaria de las denuncias</h2></div>
              <div className="tarjeta-cuerpo" style={{ height: 240, paddingLeft: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.porFranjaHoraria} margin={{ top: 4, right: 8, left: -22, bottom: 0 }} barCategoryGap={4}>
                    <CartesianGrid vertical={false} stroke="var(--gris-150)" />
                    <XAxis dataKey="clave" tickFormatter={(v: string) => v.slice(0, 2)} tick={{ fontSize: 11.5, fill: 'var(--gris-500)' }} tickLine={false} axisLine={{ stroke: 'var(--gris-200)' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11.5, fill: 'var(--gris-500)' }} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: 'var(--gris-100)' }} content={({ active, payload }) => active && payload?.length ? (
                      <div className="tooltip-grafico"><b>{payload[0].payload.clave}</b>{payload[0].value} denuncias</div>
                    ) : null} />
                    <Bar dataKey="cantidad" fill="var(--azul-700)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="tarjeta">
              <div className="tarjeta-cabecera">
                <h2>{data.porUnidadRegional.length > 1 ? 'Por unidad regional' : 'Por dependencia'}</h2>
              </div>
              <div className="tarjeta-cuerpo">
                <BarrasHorizontales
                  items={(data.porUnidadRegional.length > 1 ? data.porUnidadRegional : data.porDependencia)
                    .map((u) => ({ nombre: u.clave.replace('Unidad Regional ', ''), cantidad: u.cantidad }))}
                />
              </div>
            </section>
          </div>

          <section className="tarjeta">
            <div className="tarjeta-cabecera">
              <h2>Últimas denuncias</h2>
              <Link to="/intranet/denuncias" className="btn btn-fantasma btn-sm">Ver todas <ArrowRight /></Link>
            </div>
            {data.recientes.length === 0 ? <Vacio titulo="Todavía no hay denuncias" /> : (
              <div className="tabla-contenedor">
                <table className="tabla">
                  <thead>
                    <tr><th>Número</th><th>Tipo</th><th>Dependencia</th><th>Origen</th><th>Prioridad</th><th>Estado</th><th className="derecha">Ingreso</th></tr>
                  </thead>
                  <tbody>
                    {data.recientes.map((r) => (
                      <tr key={r.id} className="clicable" onClick={() => navegar(`/intranet/denuncias/${r.id}`)}>
                        <td className="mono celda-principal">{r.numero}</td>
                        <td>{nombreTipo(r.tipo)}</td>
                        <td>{r.dependencia ?? '—'}</td>
                        <td>{ORIGENES[r.origen]}</td>
                        <td><EtiquetaPrioridad prioridad={r.prioridad} /></td>
                        <td><InsigniaEstado estado={r.estado} /></td>
                        <td className="derecha texto-suave nowrap">{haceCuanto(r.creadaEn)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}

function Indicadores({ d }: { d: DatosPanel }) {
  const i = d.indicadores;
  return (
    <div className="indicadores">
      <Link to="/intranet/denuncias" className="tarjeta indicador" style={{ textDecoration: 'none' }}>
        <span className="rotulo"><FileText /> Recibidas</span>
        <span className="valor">{numero(i.total)}</span>
        <span className="detalle">en los últimos {d.dias} días</span>
      </Link>
      <Link to="/intranet/denuncias?abiertas=1" className="tarjeta indicador neutro" style={{ textDecoration: 'none' }}>
        <span className="rotulo"><Inbox /> Abiertas</span>
        <span className="valor">{numero(i.abiertas)}</span>
        <span className="detalle">{numero(i.cerradasEnPeriodo)} cerradas en el período</span>
      </Link>
      <Link to="/intranet/denuncias?sinInstructor=1&abiertas=1" className={`tarjeta indicador ${i.sinInstructor > 0 ? 'alerta' : 'neutro'}`} style={{ textDecoration: 'none' }}>
        <span className="rotulo"><UserX /> Sin instructor</span>
        <span className="valor">{numero(i.sinInstructor)}</span>
        <span className="detalle">pendientes de asignación</span>
      </Link>
      <div className="tarjeta indicador">
        <span className="rotulo"><AlertTriangle /> Prioridad alta</span>
        <span className="valor">{numero(i.urgentes)}</span>
        <span className="detalle">abiertas, alta o urgente</span>
      </div>
      <div className="tarjeta indicador">
        <span className="rotulo"><Timer /> Asignación</span>
        <span className="valor">{i.horasPromedioAsignacion === null ? '—' : `${i.horasPromedioAsignacion.toLocaleString('es-AR')} h`}</span>
        <span className="detalle">tiempo medio hasta tener instructor</span>
      </div>
      <div className="tarjeta indicador">
        <span className="rotulo"><Globe /> Online</span>
        <span className="valor">{i.porcentajeWeb.toLocaleString('es-AR')}%</span>
        <span className="detalle"><Clock size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> {numero(i.ultimas24Horas)} en las últimas 24 h</span>
      </div>
    </div>
  );
}

function BarrasHorizontales({ items, onElegir }: { items: { nombre: string; cantidad: number; clave?: string }[]; onElegir?: (clave: string) => void }) {
  if (items.length === 0) return <Vacio titulo="Sin datos en el período" />;
  const maximo = Math.max(...items.map((i) => i.cantidad), 1);
  return (
    <div className="barras-horizontales">
      {items.slice(0, 8).map((item) => {
        const contenido = (
          <>
            <span className="nombre">{item.nombre}</span>
            <span className="cantidad">{numero(item.cantidad)}</span>
            <span className="pista"><span className="relleno" style={{ width: `${(item.cantidad / maximo) * 100}%`, display: 'block' }} /></span>
          </>
        );
        return onElegir && item.clave ? (
          <button key={item.nombre} type="button" className="barra-h" title={`${item.nombre}: ${item.cantidad}`}
            onClick={() => onElegir(item.clave!)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', font: 'inherit' }}>
            {contenido}
          </button>
        ) : (
          <div key={item.nombre} className="barra-h" title={`${item.nombre}: ${item.cantidad}`}>{contenido}</div>
        );
      })}
    </div>
  );
}
