import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Lock, Search, UserPlus } from 'lucide-react';
import { api, mensajeDeError } from '@/api/cliente';
import { JERARQUIAS, ROLES } from '@/api/etiquetas';
import type { CredencialTemporal, Pagina, PersonalItem, Rol, Usuario } from '@/api/tipos';
import { useNotificaciones } from '@/componentes/Notificaciones';
import { Aviso, Campo, Cargando, Insignia, Modal, Vacio } from '@/componentes/ui';
import { fechaHora } from '@/lib/formato';
import { SoloRoles } from './sesion/RutaProtegida';
import { useSesion } from './sesion/ContextoSesion';

export default function Usuarios() {
  return <SoloRoles roles={['Administrador']}><VistaUsuarios /></SoloRoles>;
}

function VistaUsuarios() {
  const { sesion } = useSesion();
  const [texto, setTexto] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [alta, setAlta] = useState(false);
  const [credencial, setCredencial] = useState<CredencialTemporal | null>(null);
  const queryClient = useQueryClient();
  const { notificar } = useNotificaciones();

  useEffect(() => { const t = window.setTimeout(() => setBusqueda(texto), 350); return () => window.clearTimeout(t); }, [texto]);
  const { data, isLoading } = useQuery({ queryKey: ['usuarios', busqueda], queryFn: () => api.get<Usuario[]>('/usuarios', { texto: busqueda }) });

  const modificar = useMutation({
    mutationFn: ({ u, rol, activo }: { u: Usuario; rol: Rol; activo: boolean }) => api.put(`/usuarios/${u.id}`, { rol, activo }),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['usuarios'] }); notificar('Usuario actualizado', { tipo: 'exito' }); },
    onError: (e) => notificar(mensajeDeError(e), { tipo: 'error' }),
  });
  const restablecer = useMutation({
    mutationFn: (u: Usuario) => api.post<CredencialTemporal>(`/usuarios/${u.id}/restablecer`),
    onSuccess: (c) => { setCredencial(c); void queryClient.invalidateQueries({ queryKey: ['usuarios'] }); },
    onError: (e) => notificar(mensajeDeError(e), { tipo: 'error' }),
  });

  return (
    <>
      <div className="cabecera-vista">
        <div>
          <h1>Usuarios</h1>
          <p>Accesos al sistema por legajo. Cada efectivo puede tener un único usuario.</p>
        </div>
        <div className="acciones"><button className="btn btn-primario" onClick={() => setAlta(true)}><UserPlus /> Habilitar usuario</button></div>
      </div>
      <section className="tarjeta">
        <div className="filtros">
          <div className="campo busqueda">
            <label htmlFor="b-usr">Buscar</label>
            <div className="entrada-icono"><Search aria-hidden />
              <input id="b-usr" className="entrada" placeholder="Legajo, apellido o dependencia" value={texto} onChange={(e) => setTexto(e.target.value)} />
            </div>
          </div>
        </div>
        {isLoading ? <Cargando /> : !data?.length ? <Vacio titulo="Sin usuarios" /> : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead><tr><th>Legajo</th><th>Efectivo</th><th>Dependencia</th><th>Perfil</th><th>Estado</th><th>Último acceso</th><th /></tr></thead>
              <tbody>
                {data.map((u) => {
                  const propio = u.id === sesion?.id;
                  return (
                    <tr key={u.id}>
                      <td className="mono">{u.legajo}</td>
                      <td><span className="celda-principal">{u.nombre}</span><span className="celda-secundaria">{JERARQUIAS[u.jerarquia]}</span></td>
                      <td>{u.dependencia}</td>
                      <td>
                        <select className="seleccion" style={{ height: 32, fontSize: 13.5, width: 'auto' }} value={u.rol} disabled={propio || modificar.isPending}
                          onChange={(e) => modificar.mutate({ u, rol: e.target.value as Rol, activo: u.activo })} aria-label={`Perfil de ${u.nombre}`}>
                          {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </td>
                      <td>
                        {u.bloqueado ? <Insignia tono="rojo">Bloqueado</Insignia> : u.activo ? <Insignia tono="verde">Activo</Insignia> : <Insignia tono="gris">Deshabilitado</Insignia>}
                        {u.debeCambiarPassword && <span className="celda-secundaria">Contraseña temporal</span>}
                      </td>
                      <td className="texto-suave nowrap">{u.ultimoAcceso ? fechaHora(u.ultimoAcceso) : 'Nunca'}</td>
                      <td className="derecha nowrap">
                        <button className="btn btn-fantasma btn-sm" onClick={() => restablecer.mutate(u)} disabled={restablecer.isPending} title="Generar contraseña temporal"><KeyRound /> Restablecer</button>
                        {!propio && (
                          <button className="btn btn-fantasma btn-sm" onClick={() => modificar.mutate({ u, rol: u.rol, activo: !u.activo || u.bloqueado })}>
                            <Lock /> {u.activo && !u.bloqueado ? 'Deshabilitar' : 'Habilitar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {alta && <AltaUsuario onCerrar={() => setAlta(false)} onCreado={(c) => { setAlta(false); setCredencial(c); }} />}
      {credencial && (
        <Modal titulo="Credencial temporal" onCerrar={() => setCredencial(null)} pie={<button className="btn btn-primario" onClick={() => setCredencial(null)}>Listo</button>}>
          <p>Entregá estos datos al efectivo. En el primer ingreso el sistema le pide cambiar la contraseña.</p>
          <dl className="datos">
            <div><dt>Usuario (legajo)</dt><dd className="mono" style={{ fontSize: 18 }}>{credencial.legajo}</dd></div>
            <div><dt>Contraseña temporal</dt><dd className="mono" style={{ fontSize: 18 }}>{credencial.passwordTemporal}</dd></div>
          </dl>
          {credencial.correoEnviado
            ? <Aviso tipo="exito">También se envió por correo al efectivo.</Aviso>
            : <Aviso tipo="alerta">El efectivo no tiene correo registrado: la credencial solo se muestra en esta pantalla.</Aviso>}
        </Modal>
      )}
    </>
  );
}

function AltaUsuario({ onCerrar, onCreado }: { onCerrar: () => void; onCreado: (c: CredencialTemporal) => void }) {
  const [texto, setTexto] = useState('');
  const [personal, setPersonal] = useState<PersonalItem | null>(null);
  const [rol, setRol] = useState<Rol>('Operador');
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['personal', 'alta-usuario', texto],
    queryFn: () => api.get<Pagina<PersonalItem>>('/personal', { texto, tamano: 8 }),
    enabled: texto.trim().length >= 2,
  });
  const crear = useMutation({
    mutationFn: () => api.post<CredencialTemporal>('/usuarios', { personalId: personal!.id, rol }),
    onSuccess: (c) => { void queryClient.invalidateQueries({ queryKey: ['usuarios'] }); onCreado(c); },
  });

  return (
    <Modal titulo="Habilitar usuario" onCerrar={onCerrar} pie={
      <>
        <button className="btn btn-secundario" onClick={onCerrar}>Cancelar</button>
        <button className="btn btn-primario" disabled={!personal || crear.isPending} onClick={() => crear.mutate()}>{crear.isPending ? 'Creando…' : 'Crear usuario'}</button>
      </>
    }>
      {crear.isError && <Aviso tipo="error">{mensajeDeError(crear.error)}</Aviso>}
      <Campo etiqueta="Buscar efectivo" ayuda="Por apellido, legajo o DNI.">
        {(id, d) => <input id={id} aria-describedby={d} className="entrada" value={texto} onChange={(e) => { setTexto(e.target.value); setPersonal(null); }} autoFocus />}
      </Campo>
      {data && !personal && (
        <div className="tarjeta" style={{ maxHeight: 260, overflowY: 'auto' }}>
          {data.items.length === 0 ? <Vacio titulo="Sin coincidencias" /> : data.items.map((p) => (
            <button key={p.id} type="button" className="item-comisaria" disabled={!!p.rol} onClick={() => setPersonal(p)} style={{ opacity: p.rol ? 0.5 : 1 }}>
              <strong>{p.apellido}, {p.nombre}</strong>
              <span>Leg. {p.legajo} · {JERARQUIAS[p.jerarquia]} · {p.dependencia}{p.rol ? ' · ya tiene usuario' : ''}</span>
            </button>
          ))}
        </div>
      )}
      {personal && <Aviso tipo="info"><strong>{personal.apellido}, {personal.nombre}</strong> · Leg. {personal.legajo} · {personal.dependencia}</Aviso>}
      <Campo etiqueta="Perfil">
        {(id) => <select id={id} className="seleccion" value={rol} onChange={(e) => setRol(e.target.value as Rol)}>
          {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>}
      </Campo>
    </Modal>
  );
}
