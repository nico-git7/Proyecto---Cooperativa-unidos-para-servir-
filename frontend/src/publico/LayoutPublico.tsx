import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Lock, Menu, Phone, X } from 'lucide-react';
import { INSTITUCION } from '@/config';
import { Escudo } from '@/componentes/ui';

export function LayoutPublico() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setMenuAbierto(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="portal">
      <div className="barra-superior">
        <div className="contenedor">
          <span className="institucional">{INSTITUCION.nombre} · Provincia de Tucumán</span>
          <div className="emergencias">
            <span><Phone aria-hidden /> Emergencias <b>911</b></span>
            <span>Violencia de género <b>144</b></span>
          </div>
        </div>
      </div>

      <header className="cabecera-portal">
        <div className="contenedor">
          <Link to="/" className="marca">
            <Escudo />
            <div>
              <div className="marca-nombre">POLICÍA DE TUCUMÁN</div>
              <div className="marca-sub">{INSTITUCION.portal}</div>
            </div>
          </Link>

          <button className="boton-menu" onClick={() => setMenuAbierto((v) => !v)} aria-label="Menú" aria-expanded={menuAbierto}>
            {menuAbierto ? <X /> : <Menu />}
          </button>

          <nav className={`nav-portal ${menuAbierto ? 'abierta' : ''}`} aria-label="Principal">
            <NavLink to="/" end className={({ isActive }) => (isActive ? 'activo' : '')}>Inicio</NavLink>
            <NavLink to="/denunciar" className={({ isActive }) => (isActive ? 'activo' : '')}>Hacer una denuncia</NavLink>
            <NavLink to="/seguimiento" className={({ isActive }) => (isActive ? 'activo' : '')}>Consultar estado</NavLink>
            <NavLink to="/comisarias" className={({ isActive }) => (isActive ? 'activo' : '')}>Comisarías</NavLink>
            <Link to="/intranet" className="acceso-personal"><Lock aria-hidden /> Acceso personal</Link>
          </nav>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="pie-portal">
        <div className="contenedor">
          <div className="columnas">
            <div>
              <h4>{INSTITUCION.nombre}</h4>
              <p>La {INSTITUCION.portal} permite realizar denuncias de hechos que no requieren intervención inmediata y consultar su estado en línea.</p>
            </div>
            <div>
              <h4>Trámites</h4>
              <ul>
                <li><Link to="/denunciar">Hacer una denuncia</Link></li>
                <li><Link to="/seguimiento">Consultar el estado de una denuncia</Link></li>
                <li><Link to="/comisarias">Comisarías y dependencias</Link></li>
              </ul>
            </div>
            <div>
              <h4>Líneas de ayuda</h4>
              <ul>
                <li>Emergencias: <b>911</b></li>
                <li>Violencia de género: <b>144</b></li>
                <li>Atención las 24 horas, todos los días</li>
              </ul>
            </div>
          </div>
          <div className="legal">
            <span>© {new Date().getFullYear()} {INSTITUCION.nombre}</span>
            <span>{INSTITUCION.leyenda}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
