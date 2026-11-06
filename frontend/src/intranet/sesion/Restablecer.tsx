import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api, mensajeDeError } from '@/api/cliente';
import { Aviso, Campo, Escudo } from '@/componentes/ui';

export default function Restablecer() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [nueva, setNueva] = useState('');
  const [repetida, setRepetida] = useState('');
  const [error, setError] = useState<string>();

  const cambio = useMutation({ mutationFn: () => api.post('/auth/restablecer', { token, nueva }) });

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (nueva !== repetida) { setError('Las contraseñas no coinciden.'); return; }
    setError(undefined);
    cambio.mutate();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <form className="tarjeta tarjeta-cuerpo" onSubmit={enviar} style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 16, padding: 28 }}>
        <Escudo tamano={44} />
        <h1 style={{ fontSize: 21 }}>Elegí una nueva contraseña</h1>
        {!token && <Aviso tipo="error">El enlace no es válido. Solicitá uno nuevo desde la pantalla de ingreso.</Aviso>}
        {cambio.isSuccess ? (
          <>
            <Aviso tipo="exito">La contraseña se actualizó correctamente.</Aviso>
            <Link to="/intranet/ingresar" className="btn btn-primario">Ir al ingreso</Link>
          </>
        ) : (
          <>
            {(error || cambio.isError) && <Aviso tipo="error">{error ?? mensajeDeError(cambio.error)}</Aviso>}
            <Campo etiqueta="Nueva contraseña" ayuda="Mínimo 8 caracteres, con letras y números.">
              {(id, d) => <input id={id} aria-describedby={d} className="entrada" type="password" autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} />}
            </Campo>
            <Campo etiqueta="Repetir contraseña">
              {(id) => <input id={id} className="entrada" type="password" autoComplete="new-password" value={repetida} onChange={(e) => setRepetida(e.target.value)} />}
            </Campo>
            <button className="btn btn-primario" disabled={!token || !nueva || cambio.isPending}>Guardar contraseña</button>
          </>
        )}
      </form>
    </div>
  );
}
