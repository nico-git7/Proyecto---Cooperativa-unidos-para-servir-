import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { KeyRound } from 'lucide-react';
import { api, mensajeDeError } from '@/api/cliente';
import { JERARQUIAS, ROLES } from '@/api/etiquetas';
import { Aviso, Campo, Modal } from '@/componentes/ui';
import { useNotificaciones } from '@/componentes/Notificaciones';
import { fechaHora } from '@/lib/formato';
import { useSesion } from './sesion/ContextoSesion';

function FormularioPassword({ alGuardar }: { alGuardar: () => void }) {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetida, setRepetida] = useState('');
  const [error, setError] = useState<string>();
  const cambio = useMutation({
    mutationFn: () => api.post('/auth/cambiar-password', { actual, nueva }),
    onSuccess: () => { setActual(''); setNueva(''); setRepetida(''); alGuardar(); },
  });

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (nueva !== repetida) { setError('Las contraseñas nuevas no coinciden.'); return; }
    setError(undefined);
    cambio.mutate();
  };

  return (
    <form onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {(error || cambio.isError) && <Aviso tipo="error">{error ?? mensajeDeError(cambio.error)}</Aviso>}
      <Campo etiqueta="Contraseña actual">
        {(id) => <input id={id} className="entrada" type="password" autoComplete="current-password" value={actual} onChange={(e) => setActual(e.target.value)} />}
      </Campo>
      <Campo etiqueta="Nueva contraseña" ayuda="Mínimo 8 caracteres, combinando letras y números.">
        {(id, d) => <input id={id} aria-describedby={d} className="entrada" type="password" autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} />}
      </Campo>
      <Campo etiqueta="Repetir nueva contraseña">
        {(id) => <input id={id} className="entrada" type="password" autoComplete="new-password" value={repetida} onChange={(e) => setRepetida(e.target.value)} />}
      </Campo>
      <button className="btn btn-primario" disabled={!actual || !nueva || cambio.isPending} style={{ alignSelf: 'flex-start' }}>
        <KeyRound /> {cambio.isPending ? 'Guardando…' : 'Cambiar contraseña'}
      </button>
    </form>
  );
}

export function CambioPasswordObligatorio() {
  const { refrescar, salir } = useSesion();
  return (
    <Modal titulo="Cambiá tu contraseña temporal" onCerrar={() => undefined}
      pie={<button className="btn btn-fantasma" onClick={() => void salir()}>Cerrar sesión</button>}>
      <Aviso tipo="info">Por seguridad, antes de continuar tenés que reemplazar la contraseña temporal por una propia.</Aviso>
      <FormularioPassword alGuardar={() => void refrescar()} />
    </Modal>
  );
}

export default function MiCuenta() {
  const { sesion } = useSesion();
  const { notificar } = useNotificaciones();
  if (!sesion) return null;

  return (
    <>
      <div className="cabecera-vista">
        <div>
          <h1>Mi cuenta</h1>
          <p>Datos de tu usuario y cambio de contraseña.</p>
        </div>
      </div>
      <div className="grilla-panel">
        <section className="tarjeta">
          <div className="tarjeta-cabecera"><h2>Datos del usuario</h2></div>
          <div className="tarjeta-cuerpo">
            <dl className="datos">
              <div><dt>Apellido y nombre</dt><dd>{sesion.apellido}, {sesion.nombre}</dd></div>
              <div><dt>Legajo</dt><dd className="mono">{sesion.legajo}</dd></div>
              <div><dt>Jerarquía</dt><dd>{JERARQUIAS[sesion.jerarquia]}</dd></div>
              <div><dt>Perfil</dt><dd>{ROLES[sesion.rol]}</dd></div>
              <div className="ancho-completo"><dt>Dependencia</dt><dd>{sesion.dependencia.nombre}</dd></div>
              <div><dt>Acceso anterior</dt><dd>{fechaHora(sesion.ultimoAcceso)}</dd></div>
              <div><dt>La sesión vence</dt><dd>{fechaHora(sesion.vence)}</dd></div>
            </dl>
          </div>
        </section>
        <section className="tarjeta">
          <div className="tarjeta-cabecera"><h2>Cambiar contraseña</h2></div>
          <div className="tarjeta-cuerpo">
            <FormularioPassword alGuardar={() => notificar('Contraseña actualizada', { tipo: 'exito' })} />
          </div>
        </section>
      </div>
    </>
  );
}
