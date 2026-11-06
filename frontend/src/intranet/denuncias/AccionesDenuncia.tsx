import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, mensajeDeError } from '@/api/cliente';
import { ESTADOS, ESTADOS_CERRADOS, JERARQUIAS } from '@/api/etiquetas';
import type { DenunciaDetalle, Dependencia, EstadoDenuncia, Instructor } from '@/api/tipos';
import { Aviso, Campo, Cargando, Modal } from '@/componentes/ui';
import { useNotificaciones } from '@/componentes/Notificaciones';

function useAccion<T>(denuncia: DenunciaDetalle, ruta: string, exito: string, onCerrar: () => void) {
  const queryClient = useQueryClient();
  const { notificar } = useNotificaciones();
  return useMutation({
    mutationFn: (cuerpo: T) => api.post(`/denuncias/${denuncia.id}/${ruta}`, cuerpo),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['denuncia', denuncia.id] });
      void queryClient.invalidateQueries({ queryKey: ['denuncias'] });
      void queryClient.invalidateQueries({ queryKey: ['panel'] });
      notificar(exito, { tipo: 'exito', texto: `Denuncia N° ${denuncia.numero}` });
      onCerrar();
    },
  });
}

export function ModalEstado({ denuncia, onCerrar }: { denuncia: DenunciaDetalle; onCerrar: () => void }) {
  const opciones = denuncia.estadosSiguientes;
  const [estado, setEstado] = useState<EstadoDenuncia | ''>(opciones[0] ?? '');
  const [fundamento, setFundamento] = useState('');
  const accion = useAccion<{ estado: string; fundamento: string }>(denuncia, 'estado', 'Estado actualizado', onCerrar);
  const requiereFundamento = estado !== '' && ESTADOS_CERRADOS.includes(estado);
  const sinInstructor = !denuncia.instructor && estado !== 'Desestimada';

  return (
    <Modal titulo="Cambiar estado" onCerrar={onCerrar} pie={
      <>
        <button className="btn btn-secundario" onClick={onCerrar}>Cancelar</button>
        <button className="btn btn-primario" disabled={!estado || (requiereFundamento && !fundamento.trim()) || accion.isPending}
          onClick={() => accion.mutate({ estado, fundamento })}>
          {accion.isPending ? 'Guardando…' : 'Confirmar'}
        </button>
      </>
    }>
      {accion.isError && <Aviso tipo="error">{mensajeDeError(accion.error)}</Aviso>}
      {opciones.length === 0 ? (
        <Aviso tipo="info">La denuncia está en un estado final y no admite cambios.</Aviso>
      ) : (
        <>
          <div className="campo">
            <span className="campo-etiqueta">Nuevo estado</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {opciones.map((e) => (
                <button key={e} type="button" className="chip" aria-pressed={estado === e} onClick={() => setEstado(e)}>{ESTADOS[e].nombre}</button>
              ))}
            </div>
          </div>
          {sinInstructor && <Aviso tipo="alerta">Para avanzar, primero designá un instructor a cargo.</Aviso>}
          <Campo etiqueta={requiereFundamento ? 'Fundamento' : 'Observación (opcional)'} requerido={requiereFundamento}
            ayuda="Queda registrado en las actuaciones. El denunciante recibe un aviso del cambio de estado por correo.">
            {(id, d) => <textarea id={id} aria-describedby={d} className="area" rows={4} value={fundamento} onChange={(e) => setFundamento(e.target.value)} />}
          </Campo>
        </>
      )}
    </Modal>
  );
}

export function ModalAsignacion({ denuncia, onCerrar }: { denuncia: DenunciaDetalle; onCerrar: () => void }) {
  const [personalId, setPersonalId] = useState<number | null>(denuncia.instructor?.id ?? null);
  const accion = useAccion<{ personalId: number | null }>(denuncia, 'asignacion', 'Instructor designado', onCerrar);
  const { data, isLoading } = useQuery({
    queryKey: ['instructores', denuncia.dependencia?.id],
    queryFn: () => api.get<Instructor[]>('/personal/instructores', { dependenciaId: denuncia.dependencia!.id }),
    enabled: !!denuncia.dependencia,
  });

  return (
    <Modal titulo="Designar instructor" onCerrar={onCerrar} pie={
      <>
        <button className="btn btn-secundario" onClick={onCerrar}>Cancelar</button>
        <button className="btn btn-primario" disabled={!personalId || accion.isPending} onClick={() => accion.mutate({ personalId })}>
          {accion.isPending ? 'Guardando…' : 'Designar'}
        </button>
      </>
    }>
      {accion.isError && <Aviso tipo="error">{mensajeDeError(accion.error)}</Aviso>}
      <p className="texto-suave texto-chico">Personal en servicio efectivo de {denuncia.dependencia?.nombre}. Se ordena por menor cantidad de causas abiertas.</p>
      {isLoading ? <Cargando /> : (
        <div className="tarjeta" style={{ maxHeight: 340, overflowY: 'auto' }}>
          <table className="tabla">
            <thead><tr><th /><th>Efectivo</th><th>Jerarquía</th><th className="derecha">Abiertas</th></tr></thead>
            <tbody>
              {data?.map((p) => (
                <tr key={p.id} className="clicable" onClick={() => setPersonalId(p.id)}>
                  <td style={{ width: 36 }}><input type="radio" name="instructor" checked={personalId === p.id} onChange={() => setPersonalId(p.id)} aria-label={p.nombre} /></td>
                  <td><span className="celda-principal">{p.nombre}</span><span className="celda-secundaria">Leg. {p.legajo}</span></td>
                  <td>{JERARQUIAS[p.jerarquia]}</td>
                  <td className="derecha">{p.denunciasAbiertas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

export function ModalDerivacion({ denuncia, onCerrar }: { denuncia: DenunciaDetalle; onCerrar: () => void }) {
  const [dependenciaId, setDependenciaId] = useState('');
  const [motivo, setMotivo] = useState('');
  const accion = useAccion<{ dependenciaId: number; motivo: string }>(denuncia, 'derivacion', 'Denuncia derivada', onCerrar);
  const { data } = useQuery({ queryKey: ['dependencias'], queryFn: () => api.get<Dependencia[]>('/dependencias'), staleTime: 5 * 60_000 });

  return (
    <Modal titulo="Derivar a otra dependencia" onCerrar={onCerrar} pie={
      <>
        <button className="btn btn-secundario" onClick={onCerrar}>Cancelar</button>
        <button className="btn btn-primario" disabled={!dependenciaId || !motivo.trim() || accion.isPending}
          onClick={() => accion.mutate({ dependenciaId: Number(dependenciaId), motivo })}>
          {accion.isPending ? 'Derivando…' : 'Derivar'}
        </button>
      </>
    }>
      {accion.isError && <Aviso tipo="error">{mensajeDeError(accion.error)}</Aviso>}
      <Aviso tipo="info">La denuncia vuelve al estado «Recibida» en la dependencia de destino y se quita el instructor actual.</Aviso>
      <Campo etiqueta="Dependencia de destino" requerido>
        {(id) => (
          <select id={id} className="seleccion" value={dependenciaId} onChange={(e) => setDependenciaId(e.target.value)}>
            <option value="">Seleccionar…</option>
            {data?.filter((d) => d.id !== denuncia.dependencia?.id).map((d) => (
              <option key={d.id} value={d.id}>{d.nombre} — {d.unidadRegional}</option>
            ))}
          </select>
        )}
      </Campo>
      <Campo etiqueta="Motivo" requerido>
        {(id) => <textarea id={id} className="area" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej.: El hecho ocurrió fuera de la jurisdicción." />}
      </Campo>
    </Modal>
  );
}
