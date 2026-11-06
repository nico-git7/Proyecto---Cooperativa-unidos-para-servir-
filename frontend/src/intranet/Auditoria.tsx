import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Search } from 'lucide-react';
import { api } from '@/api/cliente';
import type { Correo, EstadoCorreo, Pagina, RegistroAuditoria } from '@/api/tipos';
import { Cargando, Insignia, Paginacion, Vacio } from '@/componentes/ui';
import { fechaHora } from '@/lib/formato';
import { SoloRoles } from './sesion/RutaProtegida';

const PLANTILLAS: Record<string, string> = {
  'denuncia-recibida': 'Constancia de denuncia',
  'denuncia-actualizada': 'Novedad de denuncia',
  'aviso-dependencia': 'Aviso a dependencia',
  bienvenida: 'Credencial de usuario',
  'restablecer-password': 'Restablecer contraseña',
};

const TONO_CORREO: Record<EstadoCorreo, string> = { Pendiente: 'ambar', Enviado: 'verde', Fallido: 'rojo' };

export default function Auditoria() {
  const [pestana, setPestana] = useState<'registro' | 'correos'>('registro');
  return (
    <SoloRoles roles={['Administrador']}>
      <div className="cabecera-vista">
        <div>
          <h1>Auditoría</h1>
          <p>Registro inalterable de operaciones y estado de los correos enviados por el sistema.</p>
        </div>
      </div>
      <section className="tarjeta">
        <div className="pestanas" role="tablist" style={{ padding: '0 12px' }}>
          <button className="pestana" role="tab" aria-selected={pestana === 'registro'} onClick={() => setPestana('registro')}>Registro de operaciones</button>
          <button className="pestana" role="tab" aria-selected={pestana === 'correos'} onClick={() => setPestana('correos')}>Correos</button>
        </div>
        {pestana === 'registro' ? <Registro /> : <Correos />}
      </section>
    </SoloRoles>
  );
}

function Registro() {
  const [texto, setTexto] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [entidad, setEntidad] = useState('');
  const [pagina, setPagina] = useState(1);
  useEffect(() => { const t = window.setTimeout(() => { setBusqueda(texto); setPagina(1); }, 350); return () => window.clearTimeout(t); }, [texto]);

  const consulta = { texto: busqueda, entidad, pagina, tamano: 30 };
  const { data, isLoading } = useQuery({
    queryKey: ['auditoria', consulta],
    queryFn: () => api.get<Pagina<RegistroAuditoria>>('/auditoria', consulta),
    placeholderData: keepPreviousData,
    refetchInterval: 15_000,
  });

  return (
    <>
      <div className="filtros">
        <div className="campo busqueda">
          <label htmlFor="b-aud">Buscar</label>
          <div className="entrada-icono"><Search aria-hidden />
            <input id="b-aud" className="entrada" placeholder="Usuario, acción, número o detalle" value={texto} onChange={(e) => setTexto(e.target.value)} />
          </div>
        </div>
        <div className="campo">
          <label htmlFor="a-ent">Entidad</label>
          <select id="a-ent" className="seleccion" value={entidad} onChange={(e) => { setEntidad(e.target.value); setPagina(1); }}>
            <option value="">Todas</option>
            {['Denuncia', 'Usuario', 'Personal', 'Móvil', 'Dependencia'].map((e) => <option key={e}>{e}</option>)}
          </select>
        </div>
      </div>
      {isLoading ? <Cargando /> : !data?.items.length ? <Vacio titulo="Sin registros" /> : (
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Registro</th><th>Detalle</th><th>IP</th></tr></thead>
            <tbody>
              {data.items.map((r) => (
                <tr key={r.id}>
                  <td className="nowrap texto-suave">{fechaHora(r.fecha)}</td>
                  <td>{r.usuario}</td>
                  <td><span className="celda-principal">{r.accion}</span></td>
                  <td className="nowrap">{r.entidad}{r.entidadId && <span className="celda-secundaria mono">{r.entidadId}</span>}</td>
                  <td style={{ maxWidth: 380 }}>{r.detalle ?? '—'}</td>
                  <td className="mono texto-suave texto-chico">{r.ip ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Paginacion pagina={data.numero} totalPaginas={data.totalPaginas} total={data.total} nombre="registros" onCambiar={setPagina} />}
    </>
  );
}

function Correos() {
  const [pagina, setPagina] = useState(1);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['correos', pagina],
    queryFn: () => api.get<Pagina<Correo>>('/auditoria/correos', { pagina, tamano: 30 }),
    placeholderData: keepPreviousData,
    refetchInterval: 5_000,
  });
  const reintentar = useMutation({
    mutationFn: (id: number) => api.post(`/auditoria/correos/${id}/reintentar`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['correos'] }),
  });

  if (isLoading) return <Cargando />;
  if (!data?.items.length) return <Vacio titulo="Todavía no se enviaron correos" texto="Aparecen acá al registrar denuncias con correo o habilitar usuarios." />;

  return (
    <>
      <div className="tabla-contenedor">
        <table className="tabla">
          <thead><tr><th>Fecha</th><th>Destinatario</th><th>Tipo</th><th>Referencia</th><th>Estado</th><th /></tr></thead>
          <tbody>
            {data.items.map((c) => (
              <tr key={c.id}>
                <td className="nowrap texto-suave">{fechaHora(c.creadoEn)}</td>
                <td>{c.destinatario}</td>
                <td>{PLANTILLAS[c.plantilla] ?? c.plantilla}</td>
                <td className="mono texto-chico">{c.referencia ?? '—'}</td>
                <td>
                  <Insignia tono={TONO_CORREO[c.estado]}>{c.estado}</Insignia>
                  <span className="celda-secundaria">
                    {c.estado === 'Enviado' ? fechaHora(c.enviadoEn) : c.ultimoError ? `${c.intentos} intentos · ${c.ultimoError}` : 'En cola'}
                  </span>
                </td>
                <td className="derecha">
                  {c.estado === 'Fallido' && (
                    <button className="btn btn-fantasma btn-sm" onClick={() => reintentar.mutate(c.id)}><RefreshCw /> Reintentar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Paginacion pagina={data.numero} totalPaginas={data.totalPaginas} total={data.total} nombre="correos" onCambiar={setPagina} />
    </>
  );
}
