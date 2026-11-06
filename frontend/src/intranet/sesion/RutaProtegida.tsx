import { useEffect, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { Rol } from '@/api/tipos';
import { Cargando, Vacio } from '@/componentes/ui';
import { Lock } from 'lucide-react';
import { useSesion } from './ContextoSesion';

export function RutaProtegida({ children }: { children: ReactNode }) {
  const { sesion, cargando, verificar } = useSesion();
  const ubicacion = useLocation();

  useEffect(verificar, [verificar]);

  if (cargando) return <Cargando texto="Verificando sesión…" />;
  if (!sesion) {
    return <Navigate to="/intranet/ingresar" replace state={{ desde: ubicacion.pathname + ubicacion.search }} />;
  }
  return <>{children}</>;
}

export function SoloRoles({ roles, children }: { roles: Rol[]; children: ReactNode }) {
  const { tieneRol } = useSesion();
  if (!tieneRol(...roles)) {
    return (
      <div className="tarjeta">
        <Vacio icono={<Lock aria-hidden />} titulo="Acceso restringido" texto="Tu perfil no tiene permisos para ver esta sección." />
      </div>
    );
  }
  return <>{children}</>;
}
