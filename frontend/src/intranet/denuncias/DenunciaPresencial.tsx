import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { api, ErrorApi, mensajeDeError } from '@/api/cliente';
import { ORDEN_TIPOS, TIPOS_DELITO } from '@/api/etiquetas';
import type { Comprobante, Dependencia } from '@/api/tipos';
import {
  aFormData, datosIniciales, erroresDelServidor, SeccionAdjuntos, SeccionDenunciante, SeccionHecho,
  validarDenunciante, validarHecho, validarTipo, type DatosDenuncia, type Errores,
} from '@/componentes/FormularioDenuncia';
import { useNotificaciones } from '@/componentes/Notificaciones';
import { Aviso, Campo } from '@/componentes/ui';
import { useSesion } from '../sesion/ContextoSesion';

export default function DenunciaPresencial() {
  const { sesion, tieneRol } = useSesion();
  const esAdmin = tieneRol('Administrador');
  const [datos, setDatos] = useState<DatosDenuncia>(datosIniciales);
  const [errores, setErrores] = useState<Errores>({});
  const [dependenciaId, setDependenciaId] = useState('');
  const navegar = useNavigate();
  const { notificar } = useNotificaciones();

  const { data: dependencias } = useQuery({
    queryKey: ['dependencias'],
    queryFn: () => api.get<Dependencia[]>('/dependencias'),
    enabled: esAdmin,
    staleTime: 5 * 60_000,
  });

  const cambiar = (cambios: Partial<DatosDenuncia>) => setDatos((d) => ({ ...d, ...cambios }));

  const alta = useMutation({
    mutationFn: () => api.post<Comprobante>('/denuncias', aFormData(datos, dependenciaId ? { dependenciaId } : {})),
    onSuccess: (c) => {
      notificar(`Denuncia N° ${c.numero} registrada`, { tipo: 'exito', texto: `Código de seguimiento ${c.codigoSeguimiento}`, duracion: 10_000 });
      navegar(`/intranet/denuncias/${c.id}`);
    },
    onError: (e) => {
      if (e instanceof ErrorApi) setErrores(erroresDelServidor(e.errores));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  });

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const todos = { ...validarTipo(datos), ...validarHecho(datos), ...validarDenunciante(datos, false) };
    setErrores(todos);
    if (Object.keys(todos).length === 0) alta.mutate();
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <form onSubmit={enviar} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="cabecera-vista">
        <div>
          <h1>Denuncia presencial</h1>
          <p>Carga de una denuncia recibida en mesa de entradas. Queda registrada a nombre de {sesion?.apellido}, {sesion?.nombre}.</p>
        </div>
        <div className="acciones">
          <button className="btn btn-primario" disabled={alta.isPending}><Save /> {alta.isPending ? 'Registrando…' : 'Registrar denuncia'}</button>
        </div>
      </div>

      {alta.isError && <Aviso tipo="error">{mensajeDeError(alta.error)}</Aviso>}
      {Object.keys(errores).length > 0 && !alta.isError && <Aviso tipo="error">Revisá los campos marcados antes de registrar.</Aviso>}

      <div className="grilla-detalle">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <section className="tarjeta">
            <div className="tarjeta-cabecera"><h2>Hecho denunciado</h2></div>
            <div className="tarjeta-cuerpo" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="grilla-form">
                <Campo etiqueta="Tipo de hecho" requerido error={errores.tipo}>
                  {(id, d) => (
                    <select id={id} aria-describedby={d} aria-invalid={!!errores.tipo} className="seleccion" value={datos.tipo ?? ''}
                      onChange={(e) => cambiar({ tipo: (e.target.value || null) as DatosDenuncia['tipo'] })}>
                      <option value="">Seleccionar…</option>
                      {ORDEN_TIPOS.map((t) => <option key={t} value={t}>{TIPOS_DELITO[t].nombre}</option>)}
                    </select>
                  )}
                </Campo>
                {esAdmin ? (
                  <Campo etiqueta="Dependencia receptora" ayuda="Si no se elige, se asigna por la ubicación del hecho.">
                    {(id, d) => (
                      <select id={id} aria-describedby={d} className="seleccion" value={dependenciaId} onChange={(e) => setDependenciaId(e.target.value)}>
                        <option value="">Automática por jurisdicción</option>
                        {dependencias?.filter((x) => x.recibeDenuncias).map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
                      </select>
                    )}
                  </Campo>
                ) : (
                  <Campo etiqueta="Dependencia receptora">
                    {(id) => <input id={id} className="entrada" value={sesion?.dependencia.nombre ?? ''} disabled />}
                  </Campo>
                )}
              </div>
              <SeccionHecho datos={datos} cambiar={cambiar} errores={errores} />
            </div>
          </section>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <section className="tarjeta">
            <div className="tarjeta-cabecera"><h2>Denunciante</h2></div>
            <div className="tarjeta-cuerpo">
              <SeccionDenunciante datos={datos} cambiar={cambiar} errores={errores} emailObligatorio={false} />
            </div>
          </section>
          <section className="tarjeta">
            <div className="tarjeta-cabecera"><h2>Documentación</h2></div>
            <div className="tarjeta-cuerpo">
              <SeccionAdjuntos archivos={datos.adjuntos} onCambiar={(adjuntos) => cambiar({ adjuntos })} />
            </div>
          </section>
          <Aviso tipo="info">Si el denunciante informa un correo, recibe la constancia con el número y el código de seguimiento.</Aviso>
        </div>
      </div>
    </form>
  );
}
