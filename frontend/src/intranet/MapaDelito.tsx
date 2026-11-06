import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CircleMarker, MapContainer, Marker, Popup } from 'react-leaflet';
import { api } from '@/api/cliente';
import { ESTADOS, GRUPOS_MAPA, grupoDeTipo, nombreTipo } from '@/api/etiquetas';
import type { Dependencia, PuntoMapa } from '@/api/tipos';
import { CapaBase, iconoDependencia } from '@/componentes/Mapa';
import { Cargando } from '@/componentes/ui';
import { fechaHora, numero } from '@/lib/formato';

const PERIODOS = [
  { dias: 7, nombre: '7 días' },
  { dias: 30, nombre: '30 días' },
  { dias: 90, nombre: '90 días' },
  { dias: 365, nombre: '12 meses' },
];

function hace(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() - dias + 1);
  return d.toISOString().slice(0, 10);
}

export default function MapaDelito() {
  const [dias, setDias] = useState(90);
  const [ocultos, setOcultos] = useState<string[]>([]);
  const [soloAbiertas, setSoloAbiertas] = useState(false);
  const [verDependencias, setVerDependencias] = useState(true);

  const { data: puntos, isLoading } = useQuery({
    queryKey: ['mapa', dias, soloAbiertas],
    queryFn: () => api.get<PuntoMapa[]>('/denuncias/mapa', { desde: hace(dias), soloAbiertas }),
  });
  const { data: dependencias } = useQuery({ queryKey: ['dependencias'], queryFn: () => api.get<Dependencia[]>('/dependencias'), staleTime: 5 * 60_000 });

  const conteo = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of puntos ?? []) {
      const g = grupoDeTipo(p.tipo).clave;
      c[g] = (c[g] ?? 0) + 1;
    }
    return c;
  }, [puntos]);

  const visibles = useMemo(() => (puntos ?? []).filter((p) => !ocultos.includes(grupoDeTipo(p.tipo).clave)), [puntos, ocultos]);
  const alternar = (clave: string) => setOcultos((o) => (o.includes(clave) ? o.filter((x) => x !== clave) : [...o, clave]));

  return (
    <>
      <div className="cabecera-vista">
        <div>
          <h1>Mapa del delito</h1>
          <p>Ubicación de los hechos denunciados con coordenadas. Tocá un punto para ver el detalle.</p>
        </div>
        <div className="acciones" role="group" aria-label="Período">
          {PERIODOS.map((p) => <button key={p.dias} className="chip" aria-pressed={dias === p.dias} onClick={() => setDias(p.dias)}>{p.nombre}</button>)}
        </div>
      </div>

      <div className="mapa-delito">
        <div className="tarjeta contenedor-mapa">
          {isLoading && <div style={{ position: 'absolute', inset: 0, zIndex: 600, background: 'rgba(255,255,255,.6)' }}><Cargando /></div>}
          <MapContainer className="mapa" center={[-26.83, -65.22]} zoom={12} style={{ height: '100%' }} preferCanvas>
            <CapaBase />
            {verDependencias && dependencias?.filter((d) => d.latitud && d.longitud).map((d) => (
              <Marker key={`d${d.id}`} position={[d.latitud!, d.longitud!]} icon={iconoDependencia}>
                <Popup><strong>{d.nombre}</strong><br />{d.direccion}<br />{d.denunciasAbiertas} denuncias abiertas</Popup>
              </Marker>
            ))}
            {visibles.map((p) => (
              <CircleMarker key={p.id} center={[p.lat, p.lng]} radius={6}
                pathOptions={{ color: '#ffffff', weight: 1.5, fillColor: grupoDeTipo(p.tipo).color, fillOpacity: 0.85 }}>
                <Popup>
                  <strong>{nombreTipo(p.tipo)}</strong><br />
                  N° {p.numero} · {ESTADOS[p.estado].nombre}<br />
                  {fechaHora(p.fechaHecho)}<br />
                  <Link to={`/intranet/denuncias/${p.id}`}>Abrir denuncia</Link>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section className="tarjeta">
            <div className="tarjeta-cabecera"><h2>Hechos en el mapa</h2><strong>{numero(visibles.length)}</strong></div>
            <div className="tarjeta-cuerpo leyenda-mapa">
              {GRUPOS_MAPA.map((g) => (
                <label key={g.clave}>
                  <input type="checkbox" checked={!ocultos.includes(g.clave)} onChange={() => alternar(g.clave)} />
                  <i style={{ background: g.color }} />
                  <span>{g.nombre}</span>
                  <span className="cantidad">{numero(conteo[g.clave] ?? 0)}</span>
                </label>
              ))}
            </div>
          </section>
          <section className="tarjeta tarjeta-cuerpo" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label className="casilla"><input type="checkbox" checked={soloAbiertas} onChange={(e) => setSoloAbiertas(e.target.checked)} /> Solo denuncias abiertas</label>
            <label className="casilla"><input type="checkbox" checked={verDependencias} onChange={(e) => setVerDependencias(e.target.checked)} /> Mostrar dependencias</label>
          </section>
          <p className="texto-chico texto-suave">
            Los colores agrupan tipos de hecho afines. El detalle de cada tipo está en el listado de denuncias, que admite los mismos filtros.
          </p>
        </aside>
      </div>
    </>
  );
}
