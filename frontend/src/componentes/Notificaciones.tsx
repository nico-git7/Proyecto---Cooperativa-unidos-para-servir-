import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { BellRing, CheckCircle2, X, XCircle } from 'lucide-react';

type Tipo = 'info' | 'exito' | 'error';
interface Notificacion { id: number; tipo: Tipo; titulo: string; texto?: ReactNode }

interface Contexto {
  notificar: (titulo: string, opciones?: { tipo?: Tipo; texto?: ReactNode; duracion?: number }) => void;
}

const NotificacionesContext = createContext<Contexto | null>(null);

export function ProveedorNotificaciones({ children }: { children: ReactNode }) {
  const [lista, setLista] = useState<Notificacion[]>([]);
  const siguiente = useRef(1);

  const quitar = useCallback((id: number) => setLista((l) => l.filter((n) => n.id !== id)), []);

  const notificar = useCallback<Contexto['notificar']>((titulo, opciones = {}) => {
    const id = siguiente.current++;
    setLista((l) => [...l.slice(-3), { id, titulo, tipo: opciones.tipo ?? 'info', texto: opciones.texto }]);
    window.setTimeout(() => quitar(id), opciones.duracion ?? 6000);
  }, [quitar]);

  const valor = useMemo(() => ({ notificar }), [notificar]);

  return (
    <NotificacionesContext.Provider value={valor}>
      {children}
      <div className="notificaciones" aria-live="polite">
        {lista.map((n) => {
          const Icono = n.tipo === 'exito' ? CheckCircle2 : n.tipo === 'error' ? XCircle : BellRing;
          return (
            <div key={n.id} className={`notificacion notificacion-${n.tipo}`}>
              <Icono aria-hidden />
              <div>
                <strong>{n.titulo}</strong>
                {n.texto && <span>{n.texto}</span>}
              </div>
              <button onClick={() => quitar(n.id)} aria-label="Cerrar"><X size={16} /></button>
            </div>
          );
        })}
      </div>
    </NotificacionesContext.Provider>
  );
}

export function useNotificaciones() {
  const ctx = useContext(NotificacionesContext);
  if (!ctx) throw new Error('useNotificaciones debe usarse dentro de ProveedorNotificaciones');
  return ctx;
}
