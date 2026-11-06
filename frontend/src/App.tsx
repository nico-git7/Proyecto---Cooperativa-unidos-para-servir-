import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Cargando } from '@/componentes/ui';
import { LayoutPublico } from '@/publico/LayoutPublico';
import { Inicio } from '@/publico/Inicio';
import { RutaProtegida } from '@/intranet/sesion/RutaProtegida';

const NuevaDenuncia = lazy(() => import('@/publico/NuevaDenuncia'));
const DenunciaEnviada = lazy(() => import('@/publico/DenunciaEnviada'));
const Seguimiento = lazy(() => import('@/publico/Seguimiento'));
const Comisarias = lazy(() => import('@/publico/Comisarias'));
const NoEncontrada = lazy(() => import('@/publico/NoEncontrada'));

const Ingreso = lazy(() => import('@/intranet/sesion/Ingreso'));
const Restablecer = lazy(() => import('@/intranet/sesion/Restablecer'));
const LayoutIntranet = lazy(() => import('@/intranet/LayoutIntranet'));
const Panel = lazy(() => import('@/intranet/Panel'));
const ListaDenuncias = lazy(() => import('@/intranet/denuncias/ListaDenuncias'));
const DetalleDenuncia = lazy(() => import('@/intranet/denuncias/DetalleDenuncia'));
const DenunciaPresencial = lazy(() => import('@/intranet/denuncias/DenunciaPresencial'));
const MapaDelito = lazy(() => import('@/intranet/MapaDelito'));
const Personal = lazy(() => import('@/intranet/Personal'));
const Moviles = lazy(() => import('@/intranet/Moviles'));
const Dependencias = lazy(() => import('@/intranet/Dependencias'));
const Usuarios = lazy(() => import('@/intranet/Usuarios'));
const Auditoria = lazy(() => import('@/intranet/Auditoria'));
const MiCuenta = lazy(() => import('@/intranet/MiCuenta'));
const Cartel = lazy(() => import('@/intranet/Cartel'));

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Cargando />}>
        <Routes>
          <Route element={<LayoutPublico />}>
            <Route index element={<Inicio />} />
            <Route path="denunciar" element={<NuevaDenuncia />} />
            <Route path="denunciar/constancia" element={<DenunciaEnviada />} />
            <Route path="seguimiento" element={<Seguimiento />} />
            <Route path="comisarias" element={<Comisarias />} />
            <Route path="*" element={<NoEncontrada />} />
          </Route>

          <Route path="intranet/ingresar" element={<Ingreso />} />
          <Route path="intranet/restablecer" element={<Restablecer />} />
          <Route
            path="intranet"
            element={<RutaProtegida><LayoutIntranet /></RutaProtegida>}
          >
            <Route index element={<Panel />} />
            <Route path="denuncias" element={<ListaDenuncias />} />
            <Route path="denuncias/nueva" element={<DenunciaPresencial />} />
            <Route path="denuncias/:id" element={<DetalleDenuncia />} />
            <Route path="mapa" element={<MapaDelito />} />
            <Route path="personal" element={<Personal />} />
            <Route path="moviles" element={<Moviles />} />
            <Route path="dependencias" element={<Dependencias />} />
            <Route path="usuarios" element={<Usuarios />} />
            <Route path="auditoria" element={<Auditoria />} />
            <Route path="cuenta" element={<MiCuenta />} />
            <Route path="cartel" element={<Cartel />} />
            <Route path="*" element={<Navigate to="/intranet" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
