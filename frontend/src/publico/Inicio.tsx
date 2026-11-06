import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock, Mail, PhoneCall, Search, ShieldCheck } from 'lucide-react';
import { ORDEN_TIPOS, TIPOS_DELITO } from '@/api/etiquetas';
import { IconoTipo } from '@/componentes/IconoTipo';
import { Aviso } from '@/componentes/ui';

export function Inicio() {
  return (
    <>
      <section className="portada">
        <div className="contenedor">
          <div>
            <div className="portada-sobretitulo">Comisaría Virtual</div>
            <h1>Hacé tu denuncia en línea, sin moverte de tu casa</h1>
            <p className="portada-texto">
              Registrá hechos como hurtos, robos, estafas o extravío de documentación las 24 horas.
              Recibís el número de denuncia por correo y podés seguir su estado desde acá.
            </p>
            <div className="portada-acciones">
              <Link to="/denunciar" className="btn btn-claro btn-lg">Hacer una denuncia <ArrowRight /></Link>
              <Link to="/seguimiento" className="btn btn-borde-claro btn-lg"><Search /> Consultar estado</Link>
            </div>
            <div className="portada-datos">
              <div><b>24 h</b><span>todos los días</span></div>
              <div><b>15 min</b><span>tiempo estimado</span></div>
              <div><b>Constancia</b><span>inmediata por correo</span></div>
            </div>
          </div>

          <aside className="tarjeta-emergencia" aria-label="Emergencias">
            <div className="cabeza">
              <PhoneCall aria-hidden />
              <div>
                <strong>¿Estás en peligro ahora?</strong>
                <span>No uses este formulario.</span>
              </div>
            </div>
            <div className="cuerpo">
              <div>
                <div className="texto-suave texto-chico">Llamá de inmediato al</div>
                <div className="numero-911">911</div>
              </div>
              <p className="texto-chico texto-suave">
                Si el hecho está ocurriendo, hay personas heridas o los autores siguen en el lugar, comunicate con el 911.
              </p>
              <div className="linea">
                <span>Violencia de género<br /><span className="texto-suave texto-chico">Gratuita, anónima, las 24 h</span></span>
                <b>144</b>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="seccion">
        <div className="contenedor">
          <div className="seccion-titulo">
            <span className="sobretitulo">Qué podés denunciar</span>
            <h2>Hechos que se pueden denunciar en línea</h2>
            <p>La denuncia queda registrada en la dependencia con jurisdicción en el lugar del hecho, que continúa con la investigación.</p>
          </div>
          <div className="grilla-tipos">
            {ORDEN_TIPOS.map((tipo) => (
              <div key={tipo} className="tipo-hecho">
                <IconoTipo tipo={tipo} />
                <strong>{TIPOS_DELITO[tipo].nombre}</strong>
                <span>{TIPOS_DELITO[tipo].descripcion}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="seccion seccion-gris">
        <div className="contenedor">
          <div className="seccion-titulo">
            <span className="sobretitulo">Cómo funciona</span>
            <h2>Tres pasos y tu denuncia queda registrada</h2>
          </div>
          <div className="pasos">
            <div className="paso">
              <div className="paso-numero">1</div>
              <h3>Completá el formulario</h3>
              <p>Indicá qué pasó, dónde y cuándo. Podés marcar el lugar en el mapa y adjuntar fotos o comprobantes.</p>
            </div>
            <div className="paso">
              <div className="paso-numero">2</div>
              <h3>Recibí tu constancia</h3>
              <p>Al enviarla obtenés el número de denuncia y un código de seguimiento, también por correo electrónico.</p>
            </div>
            <div className="paso">
              <div className="paso-numero">3</div>
              <h3>Seguí el estado</h3>
              <p>Con el código y tu DNI consultás los movimientos. Te avisamos por correo cada vez que hay novedades.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="seccion">
        <div className="contenedor requisitos">
          <div>
            <div className="seccion-titulo" style={{ marginBottom: 20 }}>
              <span className="sobretitulo">Antes de empezar</span>
              <h2>Tené a mano</h2>
            </div>
            <ul className="lista-check">
              <li><CheckCircle2 aria-hidden /> Tu DNI y un correo electrónico donde recibir la constancia.</li>
              <li><CheckCircle2 aria-hidden /> Fecha, hora aproximada y dirección del lugar del hecho.</li>
              <li><CheckCircle2 aria-hidden /> Datos de lo sustraído: marca, modelo, color, dominio o número de serie.</li>
              <li><CheckCircle2 aria-hidden /> Fotos, capturas de pantalla o comprobantes, si los tenés (hasta 5 archivos).</li>
            </ul>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Aviso tipo="alerta">
              <strong>La denuncia tiene carácter de declaración jurada.</strong> Denunciar falsamente un delito
              está penado por el artículo 245 del Código Penal.
            </Aviso>
            <Aviso tipo="info">
              <strong>Tus datos están protegidos.</strong> Solo el personal policial interviniente accede a la denuncia;
              la consulta pública muestra únicamente el estado del trámite.
            </Aviso>
            <div className="tarjeta tarjeta-cuerpo" style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Clock size={18} color="var(--celeste-600)" /> Disponible las 24 h</span>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Mail size={18} color="var(--celeste-600)" /> Constancia por correo</span>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><ShieldCheck size={18} color="var(--celeste-600)" /> Conexión segura</span>
            </div>
            <Link to="/denunciar" className="btn btn-primario btn-lg">Comenzar la denuncia <ArrowRight /></Link>
          </div>
        </div>
      </section>
    </>
  );
}
