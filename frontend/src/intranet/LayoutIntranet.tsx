import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Building2, CarFront, FilePlus2, FileText, LayoutDashboard, LogOut, Map, Menu, QrCode, ScrollText, ShieldCheck, UserCog, Users,
} from 'lucide-react';
import { JERARQUIAS_ABREV, JERARQUIAS, ROLES } from '@/api/etiquetas';
import { Escudo } from '@/componentes/ui';
import { hora, iniciales } from '@/lib/formato';
import { CambioPasswordObligatorio } from './MiCuenta';
import { useSesion } from './sesion/ContextoSesion';
import { useTiempoReal } from './TiempoReal';

export default function LayoutIntranet() {
  const { sesion, salir, tieneRol } = useSesion();
  const conectado = useTiempoReal();
  const [lateralAbierta, setLateralAbierta] = useState(false);
  const [ahora, setAhora] = useState(() => new Date());
  const { pathname } = useLocation();

  useEffect(() => setLateralAbierta(false), [pathname]);
  useEffect(() => {
    const t = window.setInterval(() => setAhora(new Date()), 20_000);
    return () => window.clearInterval(t);
  }, []);

  if (!sesion) return null;
  const esAdmin = tieneRol('Administrador');
  const esJefatura = tieneRol('Administrador', 'JefeDependencia');

  return (
    <div className="intranet">
      <aside className={`lateral ${lateralAbierta ? 'abierta' : ''}`}>
        <div className="lateral-marca">
          <Escudo tamano={30} />
          <div>
            <strong>POLICÍA DE TUCUMÁN</strong>
            <span>Sistema de Gestión Policial</span>
          </div>
        </div>
        <nav aria-label="Secciones">
          <div className="lateral-grupo">Operaciones</div>
          <NavLink to="/intranet" end><LayoutDashboard /> Panel</NavLink>
          <NavLink to="/intranet/denuncias" end><FileText /> Denuncias</NavLink>
          <NavLink to="/intranet/denuncias/nueva"><FilePlus2 /> Denuncia presencial</NavLink>
          <NavLink to="/intranet/mapa"><Map /> Mapa del delito</NavLink>

          <div className="lateral-grupo">Recursos</div>
          <NavLink to="/intranet/personal"><Users /> Personal</NavLink>
          <NavLink to="/intranet/moviles"><CarFront /> Móviles</NavLink>
          <NavLink to="/intranet/dependencias"><Building2 /> Dependencias</NavLink>
          <NavLink to="/intranet/cartel"><QrCode /> Cartel con QR</NavLink>

          {esAdmin && (
            <>
              <div className="lateral-grupo">Administración</div>
              <NavLink to="/intranet/usuarios"><UserCog /> Usuarios</NavLink>
              <NavLink to="/intranet/auditoria"><ScrollText /> Auditoría</NavLink>
            </>
          )}
        </nav>
        <div className="lateral-usuario">
          <div className="avatar" aria-hidden>{iniciales(sesion.nombre, sesion.apellido)}</div>
          <NavLink to="/intranet/cuenta" className="datos-usuario" style={{ padding: 0, background: 'none' }}>
            <span style={{ display: 'block' }}>
              <strong>{JERARQUIAS_ABREV[sesion.jerarquia] ?? JERARQUIAS[sesion.jerarquia]} {sesion.apellido}</strong>
              <span>Leg. {sesion.legajo} · {ROLES[sesion.rol]}</span>
            </span>
          </NavLink>
          <button onClick={() => void salir()} title="Cerrar sesión" aria-label="Cerrar sesión"><LogOut /></button>
        </div>
      </aside>
      {lateralAbierta && <div className="velo-lateral" onClick={() => setLateralAbierta(false)} />}

      <div className="area-principal">
        <header className="barra-intranet">
          <button className="boton-lateral" onClick={() => setLateralAbierta(true)} aria-label="Abrir menú"><Menu /></button>
          <div className="alcance">
            <ShieldCheck aria-hidden />
            <span>{esAdmin ? 'Alcance: toda la provincia' : sesion.dependencia.nombre}</span>
          </div>
          <div className="derecha">
            <span className={`en-linea ${conectado ? 'conectado' : ''}`} title={conectado ? 'Recibiendo novedades en tiempo real' : 'Sin conexión en tiempo real'}>
              <i /> {conectado ? 'En línea' : 'Reconectando'}
            </span>
            <span className="reloj">{hora(ahora)}</span>
            {esJefatura && !esAdmin && <span className="insignia insignia-azul sin-punto">Jefatura</span>}
          </div>
        </header>
        <main className="contenido-intranet">
          <Outlet />
        </main>
      </div>

      {sesion.debeCambiarPassword && <CambioPasswordObligatorio />}
    </div>
  );
}
