import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, ErrorApi, EVENTO_SESION_EXPIRADA } from '@/api/cliente';
import type { Rol, Sesion } from '@/api/tipos';

interface ContextoSesion {
  sesion: Sesion | null;
  cargando: boolean;
  ingresar: (legajo: string, password: string) => Promise<Sesion>;
  salir: () => Promise<void>;
  refrescar: () => Promise<void>;
  /** Consulta la sesión una sola vez; el portal público no la necesita. */
  verificar: () => void;
  tieneRol: (...roles: Rol[]) => boolean;
}

const Contexto = createContext<ContextoSesion | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [cargando, setCargando] = useState(true);
  const verificada = useRef(false);
  const queryClient = useQueryClient();

  const refrescar = useCallback(async () => {
    try {
      setSesion(await api.get<Sesion>('/auth/sesion'));
    } catch (error) {
      if (error instanceof ErrorApi && error.status === 401) setSesion(null);
    } finally {
      setCargando(false);
    }
  }, []);

  const verificar = useCallback(() => {
    if (verificada.current) return;
    verificada.current = true;
    void refrescar();
  }, [refrescar]);

  useEffect(() => {
    const expirada = () => {
      setSesion(null);
      queryClient.clear();
    };
    window.addEventListener(EVENTO_SESION_EXPIRADA, expirada);
    return () => window.removeEventListener(EVENTO_SESION_EXPIRADA, expirada);
  }, [queryClient]);

  const ingresar = useCallback(async (legajo: string, password: string) => {
    const nueva = await api.post<Sesion>('/auth/login', { legajo, password });
    queryClient.clear();
    verificada.current = true;
    setCargando(false);
    setSesion(nueva);
    return nueva;
  }, [queryClient]);

  const salir = useCallback(async () => {
    await api.post('/auth/logout').catch(() => undefined);
    queryClient.clear();
    setSesion(null);
  }, [queryClient]);

  const tieneRol = useCallback((...roles: Rol[]) => !!sesion && roles.includes(sesion.rol), [sesion]);

  const valor = useMemo(
    () => ({ sesion, cargando, ingresar, salir, refrescar, verificar, tieneRol }),
    [sesion, cargando, ingresar, salir, refrescar, verificar, tieneRol],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion() {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useSesion debe usarse dentro de ProveedorSesion');
  return ctx;
}
