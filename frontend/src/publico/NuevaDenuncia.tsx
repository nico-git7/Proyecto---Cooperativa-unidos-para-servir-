import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, Pencil, Send } from 'lucide-react';
import { api, ErrorApi, mensajeDeError } from '@/api/cliente';
import { TIPOS_DELITO } from '@/api/etiquetas';
import type { Comprobante } from '@/api/tipos';
import {
  aFormData, datosIniciales, erroresDelServidor, SeccionAdjuntos, SeccionDenunciante, SeccionHecho, SeccionTipo,
  validarDenunciante, validarHecho, validarTipo, type DatosDenuncia, type Errores,
} from '@/componentes/FormularioDenuncia';
import { Aviso } from '@/componentes/ui';
import { deInputFechaHora, fechaHora } from '@/lib/formato';

const PASOS = ['Tipo de hecho', 'El hecho', 'Tus datos', 'Revisión y envío'];
export const CLAVE_CONSTANCIA = 'sgp:ultima-constancia';

export default function NuevaDenuncia() {
  const [paso, setPaso] = useState(0);
  const [datos, setDatos] = useState<DatosDenuncia>(datosIniciales);
  const [errores, setErrores] = useState<Errores>({});
  const navegar = useNavigate();

  const cambiar = (cambios: Partial<DatosDenuncia>) => {
    setDatos((d) => ({ ...d, ...cambios }));
    if (Object.keys(errores).length) setErrores({});
  };

  const envio = useMutation({
    mutationFn: () => api.post<Comprobante>('/publico/denuncias', aFormData(datos)),
    onSuccess: (comprobante) => {
      sessionStorage.setItem(CLAVE_CONSTANCIA, JSON.stringify(comprobante));
      navegar('/denunciar/constancia', { replace: true, state: comprobante });
    },
    onError: (error) => {
      if (error instanceof ErrorApi && Object.keys(error.errores).length) {
        const delServidor = erroresDelServidor(error.errores);
        setErrores(delServidor);
        if (delServidor.tipo) setPaso(0);
        else if (Object.keys(delServidor).some((k) => k.startsWith('denunciante'))) setPaso(2);
        else setPaso(1);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  });

  const validar = (n: number) =>
    n === 0 ? validarTipo(datos) : n === 1 ? validarHecho(datos) : n === 2 ? validarDenunciante(datos, true) : {};

  const avanzar = () => {
    const e = validar(paso);
    setErrores(e);
    if (Object.keys(e).length === 0) {
      setPaso((p) => p + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const retroceder = () => {
    setErrores({});
    setPaso((p) => Math.max(0, p - 1));
  };

  return (
    <>
      <div className="encabezado-pagina">
        <div className="contenedor">
          <nav className="migas" aria-label="Ruta"><Link to="/">Inicio</Link> / <span>Hacer una denuncia</span></nav>
          <h1>Denuncia en línea</h1>
          <p>Completá los datos con la mayor precisión posible. Los campos marcados con * son obligatorios.</p>
        </div>
      </div>

      <div className="contenedor cuerpo-pagina">
        <ol className="pasos-asistente" style={{ padding: 0 }}>
          {PASOS.map((nombre, i) => (
            <li key={nombre} className={`paso-asistente ${i === paso ? 'actual' : i < paso ? 'hecho' : ''}`} aria-current={i === paso ? 'step' : undefined}>
              <span className="circulo">{i < paso ? <Check /> : i + 1}</span>
              <span className="texto">{nombre}</span>
            </li>
          ))}
        </ol>

        <div className="disposicion-asistente">
          <div className="tarjeta panel-asistente">
            {envio.isError && !Object.keys(errores).length && (
              <div style={{ marginBottom: 18 }}><Aviso tipo="error">{mensajeDeError(envio.error)}</Aviso></div>
            )}

            {paso === 0 && (
              <>
                <h2>¿Qué tipo de hecho querés denunciar?</h2>
                <p className="bajada">Elegí la opción que mejor lo describa. Si no estás seguro, elegí la más parecida.</p>
                <SeccionTipo valor={datos.tipo} onCambiar={(tipo) => cambiar({ tipo })} error={errores.tipo} />
              </>
            )}

            {paso === 1 && (
              <>
                <h2>Contanos qué pasó</h2>
                <p className="bajada">Indicá cuándo y dónde ocurrió el hecho, y describilo con tus palabras.</p>
                <SeccionHecho datos={datos} cambiar={cambiar} errores={errores} />
                <div style={{ marginTop: 18 }}>
                  <SeccionAdjuntos archivos={datos.adjuntos} onCambiar={(adjuntos) => cambiar({ adjuntos })} />
                </div>
              </>
            )}

            {paso === 2 && (
              <>
                <h2>Tus datos</h2>
                <p className="bajada">Son necesarios para que la dependencia pueda contactarte y para validar la consulta del estado.</p>
                <SeccionDenunciante datos={datos} cambiar={cambiar} errores={errores} emailObligatorio />
              </>
            )}

            {paso === 3 && (
              <Revision datos={datos} irA={setPaso} onDeclaracion={(v) => cambiar({ declaracionJurada: v })} />
            )}

            <div className="acciones-asistente">
              {paso > 0 ? (
                <button type="button" className="btn btn-secundario" onClick={retroceder} disabled={envio.isPending}><ArrowLeft /> Anterior</button>
              ) : <span />}
              {paso < PASOS.length - 1 ? (
                <button type="button" className="btn btn-primario" onClick={avanzar}>Continuar <ArrowRight /></button>
              ) : (
                <button type="button" className="btn btn-acento" disabled={!datos.declaracionJurada || envio.isPending} onClick={() => envio.mutate()}>
                  <Send /> {envio.isPending ? 'Enviando…' : 'Enviar denuncia'}
                </button>
              )}
            </div>
          </div>

          <aside className="lateral-asistente">
            <div className="tarjeta tarjeta-cuerpo">
              <h3 style={{ fontSize: 15, marginBottom: 8 }}>Importante</h3>
              <p className="texto-chico texto-suave" style={{ lineHeight: 1.55 }}>
                Este formulario no es para emergencias. Si el hecho está ocurriendo o hay personas en peligro, llamá al <strong>911</strong>.
              </p>
            </div>
            <div className="tarjeta tarjeta-cuerpo">
              <h3 style={{ fontSize: 15, marginBottom: 8 }}>¿Qué pasa después?</h3>
              <p className="texto-chico texto-suave" style={{ lineHeight: 1.55 }}>
                La denuncia se asigna a la comisaría con jurisdicción en el lugar del hecho. Un instructor toma intervención y
                puede citarte para ampliar la declaración.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

function Revision({ datos, irA, onDeclaracion }: { datos: DatosDenuncia; irA: (p: number) => void; onDeclaracion: (v: boolean) => void }) {
  const p = datos.denunciante;
  const Editar = ({ paso }: { paso: number }) => (
    <button type="button" className="btn btn-fantasma btn-sm" onClick={() => irA(paso)}><Pencil /> Editar</button>
  );

  return (
    <>
      <h2>Revisá los datos antes de enviar</h2>
      <p className="bajada">Una vez enviada, la denuncia no se puede modificar desde la web. Para ampliarla vas a tener que acercarte a la dependencia.</p>
      <div className="resumen-revision">
        <section>
          <h3>El hecho <Editar paso={1} /></h3>
          <dl className="datos">
            <div><dt>Tipo</dt><dd>{datos.tipo ? TIPOS_DELITO[datos.tipo].nombre : '—'}</dd></div>
            <div><dt>Fecha y hora</dt><dd>{datos.fechaHecho ? fechaHora(deInputFechaHora(datos.fechaHecho)) : '—'}</dd></div>
            <div className="ancho-completo"><dt>Lugar</dt><dd>{datos.lugarHecho}, {datos.localidad}{datos.ubicacion ? ' · ubicación marcada en el mapa' : ''}</dd></div>
            {datos.bienesInvolucrados && <div className="ancho-completo"><dt>Bienes involucrados</dt><dd>{datos.bienesInvolucrados}</dd></div>}
            <div className="ancho-completo"><dt>Relato</dt><dd className="relato">{datos.relato}</dd></div>
            <div><dt>Archivos adjuntos</dt><dd>{datos.adjuntos.length ? datos.adjuntos.map((a) => a.name).join(', ') : 'Ninguno'}</dd></div>
          </dl>
        </section>
        <section>
          <h3>Denunciante <Editar paso={2} /></h3>
          <dl className="datos">
            <div><dt>Nombre</dt><dd>{p.apellido}, {p.nombre}</dd></div>
            <div><dt>DNI</dt><dd>{p.dni}</dd></div>
            <div><dt>Correo</dt><dd>{p.email}</dd></div>
            <div><dt>Teléfono</dt><dd>{p.telefono || '—'}</dd></div>
            <div className="ancho-completo"><dt>Domicilio</dt><dd>{p.domicilio}, {p.localidad}</dd></div>
          </dl>
        </section>
        <label className="casilla">
          <input type="checkbox" checked={datos.declaracionJurada} onChange={(e) => onDeclaracion(e.target.checked)} />
          <span>
            Declaro bajo juramento que los datos consignados son verdaderos y que conozco que la falsa denuncia
            constituye delito según el artículo 245 del Código Penal.
          </span>
        </label>
      </div>
    </>
  );
}
