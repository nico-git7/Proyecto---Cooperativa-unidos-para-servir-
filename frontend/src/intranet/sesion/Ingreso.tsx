import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Bell, Eye, EyeOff, FileText, LogIn, MapPinned, ShieldCheck } from 'lucide-react';
import { api, mensajeDeError } from '@/api/cliente';
import type { ConfiguracionPublica } from '@/api/tipos';
import { Aviso, Campo, Escudo } from '@/componentes/ui';
import { INSTITUCION } from '@/config';
import { useSesion } from './ContextoSesion';

export default function Ingreso() {
  const { sesion, ingresar, verificar } = useSesion();
  const [legajo, setLegajo] = useState('');
  const [password, setPassword] = useState('');
  const [ver, setVer] = useState(false);
  const [recupero, setRecupero] = useState(false);
  const navegar = useNavigate();
  const { state } = useLocation();
  const destino = (state as { desde?: string } | null)?.desde ?? '/intranet';

  const { data: config } = useQuery({
    queryKey: ['publico', 'configuracion'],
    queryFn: () => api.get<ConfiguracionPublica>('/publico/configuracion'),
    staleTime: Infinity,
  });

  const login = useMutation({
    mutationFn: () => ingresar(legajo.trim(), password),
    onSuccess: () => navegar(destino, { replace: true }),
  });

  const recuperar = useMutation({ mutationFn: () => api.post('/auth/recuperar', { legajo: legajo.trim() }) });

  // Si ya hay una sesión activa se va directo al sistema.
  useEffect(verificar, [verificar]);
  if (sesion) return <Navigate to={destino} replace />;

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (recupero) recuperar.mutate();
    else login.mutate();
  };

  return (
    <div className="ingreso">
      <section className="ingreso-institucional">
        <div>
          <Escudo tamano={64} />
          <h1>{INSTITUCION.sistema}</h1>
          <p className="bajada">Gestión de denuncias, personal y recursos operativos de la {INSTITUCION.nombre}.</p>
          <ul>
            <li><FileText aria-hidden /> Denuncias de la Comisaría Virtual y presenciales en un solo circuito.</li>
            <li><Bell aria-hidden /> Aviso en tiempo real cuando ingresa una denuncia a la dependencia.</li>
            <li><MapPinned aria-hidden /> Mapa del delito y estadísticas por jurisdicción.</li>
            <li><ShieldCheck aria-hidden /> Acceso por legajo, perfiles por función y registro de auditoría.</li>
          </ul>
        </div>
        <div className="pie">Uso exclusivo del personal policial autorizado. Toda la actividad queda registrada.</div>
      </section>

      <section className="ingreso-formulario">
        <form onSubmit={enviar} noValidate>
          <Link to="/" className="texto-chico" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--gris-600)' }}>
            <ArrowLeft size={15} /> Volver a la Comisaría Virtual
          </Link>
          <div>
            <h2>{recupero ? 'Restablecer contraseña' : 'Ingreso del personal'}</h2>
          </div>
          <p className="bajada">
            {recupero
              ? 'Te enviaremos un enlace al correo registrado en tu legajo.'
              : 'Ingresá con tu número de legajo y tu contraseña.'}
          </p>

          {login.isError && <Aviso tipo="error">{mensajeDeError(login.error)}</Aviso>}
          {recuperar.isSuccess && (
            <Aviso tipo="exito">Si el legajo tiene un correo registrado, vas a recibir el enlace en los próximos minutos.</Aviso>
          )}
          {recuperar.isError && <Aviso tipo="error">{mensajeDeError(recuperar.error)}</Aviso>}

          <Campo etiqueta="Legajo">
            {(id) => (
              <input id={id} className="entrada" inputMode="numeric" autoComplete="username" autoFocus value={legajo}
                onChange={(e) => setLegajo(e.target.value.replace(/\D/g, ''))} />
            )}
          </Campo>

          {!recupero && (
            <Campo etiqueta="Contraseña">
              {(id) => (
                <div style={{ position: 'relative' }}>
                  <input id={id} className="entrada" type={ver ? 'text' : 'password'} autoComplete="current-password"
                    value={password} onChange={(e) => setPassword(e.target.value)} style={{ paddingRight: 44 }} />
                  <button type="button" className="btn btn-fantasma btn-icono btn-sm" onClick={() => setVer((v) => !v)}
                    aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'} style={{ position: 'absolute', right: 4, top: 4 }}>
                    {ver ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              )}
            </Campo>
          )}

          <button className="btn btn-primario btn-lg btn-bloque" disabled={!legajo || (!recupero && !password) || login.isPending || recuperar.isPending}>
            {recupero ? 'Enviar enlace' : <><LogIn /> {login.isPending ? 'Ingresando…' : 'Ingresar'}</>}
          </button>

          <button type="button" className="btn btn-fantasma btn-sm" style={{ alignSelf: 'center' }}
            onClick={() => { setRecupero((v) => !v); login.reset(); recuperar.reset(); }}>
            {recupero ? 'Volver al ingreso' : '¿Olvidaste tu contraseña?'}
          </button>

          {config?.modoDemo && !recupero && (
            <div className="accesos-demo">
              <strong>Accesos de demostración · contraseña <span className="mono" style={{ textTransform: 'none', color: 'var(--azul-900)' }}>{config.passwordDemo}</span></strong>
              {config.accesosDemo.map((a) => (
                <button type="button" key={a.legajo} onClick={() => { setLegajo(a.legajo); setPassword(config.passwordDemo ?? ''); }}>
                  <span>{a.perfil}<br /><span className="texto-suave">{a.descripcion}</span></span>
                  <b>{a.legajo}</b>
                </button>
              ))}
            </div>
          )}
        </form>
      </section>
    </div>
  );
}
