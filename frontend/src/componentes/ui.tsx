import { useEffect, useId, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Inbox, Info, X, XCircle } from 'lucide-react';
import { ESTADOS, PRIORIDADES } from '@/api/etiquetas';
import type { EstadoDenuncia, Prioridad } from '@/api/tipos';
import { numero } from '@/lib/formato';

export function Escudo({ tamano = 40 }: { tamano?: number }) {
  return <img src="/escudo.svg" width={tamano} height={Math.round(tamano * 1.156)} alt="" />;
}

interface CampoProps {
  etiqueta: string;
  error?: string;
  ayuda?: ReactNode;
  requerido?: boolean;
  className?: string;
  children: (id: string, describedBy?: string) => ReactNode;
}

/** Envoltorio de campo con etiqueta, ayuda y error asociados por aria. */
export function Campo({ etiqueta, error, ayuda, requerido, className, children }: CampoProps) {
  const id = useId();
  const idAyuda = `${id}-ayuda`;
  return (
    <div className={`campo ${className ?? ''}`}>
      <label htmlFor={id}>
        {etiqueta}
        {requerido && <span className="requerido" aria-hidden>*</span>}
      </label>
      {children(id, error || ayuda ? idAyuda : undefined)}
      {error ? (
        <span className="campo-error" id={idAyuda} role="alert">{error}</span>
      ) : ayuda ? (
        <span className="campo-ayuda" id={idAyuda}>{ayuda}</span>
      ) : null}
    </div>
  );
}

export function InsigniaEstado({ estado }: { estado: EstadoDenuncia }) {
  const e = ESTADOS[estado];
  return <span className={`insignia insignia-${e.tono}`}>{e.nombre}</span>;
}

export function Insignia({ tono, children, sinPunto }: { tono: string; children: ReactNode; sinPunto?: boolean }) {
  return <span className={`insignia insignia-${tono} ${sinPunto ? 'sin-punto' : ''}`}>{children}</span>;
}

export function EtiquetaPrioridad({ prioridad }: { prioridad: Prioridad }) {
  const p = PRIORIDADES[prioridad];
  return (
    <span className="etiqueta-prioridad" style={{ color: prioridad === 'Baja' ? 'var(--gris-600)' : p.color }}>
      <i style={{ background: p.color }} />
      {p.nombre}
    </span>
  );
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="cargando" role="status">
      <div className="girador" />
      <span>{texto}</span>
    </div>
  );
}

export function Vacio({ titulo, texto, icono }: { titulo: string; texto?: string; icono?: ReactNode }) {
  return (
    <div className="vacio">
      {icono ?? <Inbox aria-hidden />}
      <strong>{titulo}</strong>
      {texto && <span>{texto}</span>}
    </div>
  );
}

type TipoAviso = 'info' | 'alerta' | 'error' | 'exito';
const ICONO_AVISO = { info: Info, alerta: AlertTriangle, error: XCircle, exito: CheckCircle2 };

export function Aviso({ tipo = 'info', children }: { tipo?: TipoAviso; children: ReactNode }) {
  const Icono = ICONO_AVISO[tipo];
  return (
    <div className={`aviso aviso-${tipo}`} role={tipo === 'error' ? 'alert' : undefined}>
      <Icono aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export function Paginacion({ pagina, totalPaginas, total, onCambiar, nombre = 'registros' }: {
  pagina: number; totalPaginas: number; total: number; onCambiar: (p: number) => void; nombre?: string;
}) {
  if (total === 0) return null;
  return (
    <div className="paginacion">
      <span>{numero(total)} {nombre} · página {pagina} de {Math.max(1, totalPaginas)}</span>
      <div className="paginacion-botones">
        <button className="btn btn-secundario btn-sm" disabled={pagina <= 1} onClick={() => onCambiar(pagina - 1)}>
          <ChevronLeft /> Anterior
        </button>
        <button className="btn btn-secundario btn-sm" disabled={pagina >= totalPaginas} onClick={() => onCambiar(pagina + 1)}>
          Siguiente <ChevronRight />
        </button>
      </div>
    </div>
  );
}

export function Modal({ titulo, onCerrar, children, pie, ancho }: {
  titulo: string; onCerrar: () => void; children: ReactNode; pie?: ReactNode; ancho?: boolean;
}) {
  useEffect(() => {
    const teclado = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    document.addEventListener('keydown', teclado);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', teclado);
      document.body.style.overflow = overflow;
    };
  }, [onCerrar]);

  return (
    <div className="modal-fondo" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className={`modal ${ancho ? 'modal-ancho' : ''}`} role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="modal-cabecera">
          <h2>{titulo}</h2>
          <button className="btn btn-fantasma btn-icono btn-sm" onClick={onCerrar} aria-label="Cerrar"><X /></button>
        </div>
        <div className="modal-cuerpo">{children}</div>
        {pie && <div className="modal-pie">{pie}</div>}
      </div>
    </div>
  );
}
