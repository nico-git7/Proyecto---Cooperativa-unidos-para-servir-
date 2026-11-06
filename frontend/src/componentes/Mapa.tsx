import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { CENTRO_TUCUMAN } from '@/config';

const ATRIBUCION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

function SinBandera() {
  const mapa = useMap();
  useEffect(() => {
    mapa.attributionControl?.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
  }, [mapa]);
  return null;
}

export function CapaBase() {
  return (
    <>
      <SinBandera />
    <TileLayer
      attribution={ATRIBUCION}
      url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      subdomains="abcd"
      maxZoom={19}
    />
    </>
  );
}

const svgEdificio =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4M10 10h4M10 14h4M10 18h4"/></svg>';

export const iconoDependencia = L.divIcon({
  className: '',
  html: `<div class="marcador-dependencia">${svgEdificio}</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  popupAnchor: [0, -14],
});

export const iconoHecho = L.divIcon({
  className: '',
  html: '<div class="marcador-hecho"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 22],
});

/** Mueve la vista cuando cambia el centro pedido desde afuera. */
export function Volar({ centro, zoom }: { centro: [number, number] | null; zoom?: number }) {
  const mapa = useMap();
  useEffect(() => {
    if (centro) mapa.flyTo(centro, zoom ?? Math.max(mapa.getZoom(), 15), { duration: 0.6 });
  }, [centro, zoom, mapa]);
  return null;
}

function CapturarClic({ onElegir }: { onElegir: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onElegir(e.latlng.lat, e.latlng.lng) });
  return null;
}

export function SelectorUbicacion({ valor, onCambiar, centro }: {
  valor: [number, number] | null;
  onCambiar: (lat: number, lng: number) => void;
  centro?: [number, number] | null;
}) {
  return (
    <MapContainer className="mapa" center={valor ?? CENTRO_TUCUMAN} zoom={valor ? 16 : 13} scrollWheelZoom>
      <CapaBase />
      <CapturarClic onElegir={onCambiar} />
      {valor && (
        <Marker
          position={valor}
          icon={iconoHecho}
          draggable
          eventHandlers={{ dragend: (e) => { const p = (e.target as L.Marker).getLatLng(); onCambiar(p.lat, p.lng); } }}
        />
      )}
      <Volar centro={centro ?? null} zoom={16} />
    </MapContainer>
  );
}
