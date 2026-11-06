import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, Marker, Popup } from 'react-leaflet';
import { Search } from 'lucide-react';
import { api } from '@/api/cliente';
import type { DependenciaPublica } from '@/api/tipos';
import { CapaBase, iconoDependencia, Volar } from '@/componentes/Mapa';
import { Cargando, Vacio } from '@/componentes/ui';

export default function Comisarias() {
  const [texto, setTexto] = useState('');
  const [unidad, setUnidad] = useState('');
  const [seleccionada, setSeleccionada] = useState<DependenciaPublica | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['publico', 'dependencias'],
    queryFn: () => api.get<DependenciaPublica[]>('/publico/dependencias'),
    staleTime: 10 * 60_000,
  });

  const unidades = useMemo(() => [...new Set((data ?? []).map((d) => d.unidadRegional))], [data]);
  const filtradas = useMemo(() => {
    const t = texto.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    return (data ?? []).filter((d) => {
      if (unidad && d.unidadRegional !== unidad) return false;
      if (!t) return true;
      return `${d.nombre} ${d.localidad} ${d.direccion}`.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').includes(t);
    });
  }, [data, texto, unidad]);

  return (
    <>
      <div className="encabezado-pagina">
        <div className="contenedor">
          <nav className="migas" aria-label="Ruta"><Link to="/">Inicio</Link> / <span>Comisarías</span></nav>
          <h1>Comisarías y dependencias</h1>
          <p>Direcciones y teléfonos de las dependencias que reciben denuncias en toda la provincia.</p>
        </div>
      </div>
      <div className="contenedor cuerpo-pagina">
        {isLoading ? <Cargando /> : (
          <div className="comisarias-grilla">
            <div className="tarjeta" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, borderBottom: '1px solid var(--gris-150)' }}>
                <div className="entrada-icono">
                  <Search aria-hidden />
                  <input className="entrada" placeholder="Buscar por nombre o localidad" value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Buscar" />
                </div>
                <select className="seleccion" value={unidad} onChange={(e) => setUnidad(e.target.value)} aria-label="Unidad regional">
                  <option value="">Todas las unidades regionales</option>
                  {unidades.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="lista-comisarias">
                {filtradas.length === 0 && <Vacio titulo="Sin resultados" texto="Probá con otra búsqueda." />}
                {filtradas.map((d) => (
                  <button key={d.id} className={`item-comisaria ${seleccionada?.id === d.id ? 'activo' : ''}`} onClick={() => setSeleccionada(d)}>
                    <strong>{d.nombre}</strong>
                    <span>{d.direccion}, {d.localidad}</span>
                    <span>{d.unidadRegional}{d.telefono ? ` · Tel. ${d.telefono}` : ''}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="tarjeta mapa-col" style={{ overflow: 'hidden' }}>
              <MapContainer className="mapa" center={[-26.95, -65.35]} zoom={9} style={{ height: '100%', borderRadius: 0 }}>
                <CapaBase />
                {filtradas.filter((d) => d.latitud && d.longitud).map((d) => (
                  <Marker key={d.id} position={[d.latitud!, d.longitud!]} icon={iconoDependencia} eventHandlers={{ click: () => setSeleccionada(d) }}>
                    <Popup>
                      <strong>{d.nombre}</strong><br />
                      {d.direccion}, {d.localidad}<br />
                      {d.telefono && <>Tel. {d.telefono}</>}
                    </Popup>
                  </Marker>
                ))}
                <Volar centro={seleccionada?.latitud ? [seleccionada.latitud, seleccionada.longitud!] : null} zoom={15} />
              </MapContainer>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
