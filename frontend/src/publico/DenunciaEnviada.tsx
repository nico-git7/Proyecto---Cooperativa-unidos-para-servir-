import { Link, useLocation } from 'react-router-dom';
import { Mail, Printer, Search } from 'lucide-react';
import { nombreTipo } from '@/api/etiquetas';
import type { Comprobante } from '@/api/tipos';
import { Aviso, Escudo } from '@/componentes/ui';
import { INSTITUCION } from '@/config';
import { fechaHora } from '@/lib/formato';
import { CLAVE_CONSTANCIA } from './NuevaDenuncia';

function leerGuardada(): Comprobante | null {
  try {
    const texto = sessionStorage.getItem(CLAVE_CONSTANCIA);
    return texto ? (JSON.parse(texto) as Comprobante) : null;
  } catch {
    return null;
  }
}

export default function DenunciaEnviada() {
  const { state } = useLocation();
  const c = (state as Comprobante | null) ?? leerGuardada();

  if (!c) {
    return (
      <div className="contenedor cuerpo-pagina" style={{ maxWidth: 640 }}>
        <Aviso tipo="info">
          No hay una constancia para mostrar. Si ya realizaste la denuncia, podés consultar su estado con el código de seguimiento
          que te enviamos por correo. <Link to="/seguimiento">Consultar estado</Link>
        </Aviso>
      </div>
    );
  }

  return (
    <div className="contenedor cuerpo-pagina">
      <div className="constancia">
        <div className="no-imprimir" style={{ marginBottom: 18 }}>
          <Aviso tipo="exito">
            <strong>Tu denuncia fue registrada.</strong>{' '}
            {c.correoEnviado ? 'También te enviamos esta constancia por correo electrónico.' : 'Guardá o imprimí esta constancia.'}
          </Aviso>
        </div>

        <article className="tarjeta constancia-documento">
          <header className="constancia-encabezado">
            <Escudo tamano={44} />
            <div>
              <strong>POLICÍA DE TUCUMÁN</strong>
              <span>{INSTITUCION.portal}</span>
            </div>
          </header>

          <h1>Constancia de recepción de denuncia</h1>

          <div className="constancia-codigos">
            <div><span>Número de denuncia</span><b>{c.numero}</b></div>
            <div><span>Código de seguimiento</span><b>{c.codigoSeguimiento}</b></div>
          </div>

          <dl className="datos">
            <div><dt>Fecha y hora</dt><dd>{fechaHora(c.fecha)}</dd></div>
            <div><dt>Tipo de hecho</dt><dd>{nombreTipo(c.tipo)}</dd></div>
            <div><dt>Denunciante</dt><dd>{c.denunciante}</dd></div>
            <div><dt>Archivos adjuntos</dt><dd>{c.adjuntos}</dd></div>
            <div className="ancho-completo">
              <dt>Dependencia interviniente</dt>
              <dd>
                {c.dependencia ? (
                  <>
                    <strong>{c.dependencia.nombre}</strong><br />
                    {c.dependencia.direccion}, {c.dependencia.localidad}
                    {c.dependencia.telefono && <> · Tel. {c.dependencia.telefono}</>}
                  </>
                ) : 'A determinar por la Mesa de Entradas'}
              </dd>
            </div>
          </dl>

          <p className="constancia-texto">
            La presente acredita la recepción de la denuncia a través de la {INSTITUCION.portal}. La dependencia interviniente
            podrá requerir su presencia para ratificar o ampliar la declaración. Para consultar el estado del trámite ingrese el
            código de seguimiento y su número de documento en la sección «Consultar estado».
          </p>
        </article>

        <div className="constancia-acciones no-imprimir">
          <button className="btn btn-secundario" onClick={() => window.print()}><Printer /> Imprimir constancia</button>
          <Link to={`/seguimiento?codigo=${c.codigoSeguimiento}`} className="btn btn-primario"><Search /> Consultar estado</Link>
          {c.correoEnviado && <span className="texto-suave texto-chico" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={15} /> Copia enviada por correo</span>}
        </div>
      </div>
    </div>
  );
}
