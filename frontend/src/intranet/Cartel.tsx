import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Printer } from 'lucide-react';
import { Campo, Escudo } from '@/componentes/ui';
import { INSTITUCION } from '@/config';

/** Cartel imprimible para exhibir en las dependencias con acceso directo a la Comisaría Virtual. */
export default function Cartel() {
  const [url, setUrl] = useState(`${window.location.origin}/denunciar`);
  const [qr, setQr] = useState('');

  useEffect(() => {
    QRCode.toDataURL(url, { width: 640, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0b2545', light: '#ffffff' } })
      .then(setQr)
      .catch(() => setQr(''));
  }, [url]);

  return (
    <>
      <div className="cabecera-vista no-imprimir">
        <div>
          <h1>Cartel para dependencias</h1>
          <p>Imprimilo en A4 y exhibilo en la mesa de entradas para difundir la denuncia en línea.</p>
        </div>
        <div className="acciones">
          <button className="btn btn-primario" onClick={() => window.print()}><Printer /> Imprimir</button>
        </div>
      </div>

      <div className="tarjeta tarjeta-cuerpo no-imprimir" style={{ maxWidth: 640 }}>
        <Campo etiqueta="Dirección a la que lleva el código" ayuda="Por defecto, el formulario de denuncia de este mismo sitio.">
          {(id, d) => <input id={id} aria-describedby={d} className="entrada" value={url} onChange={(e) => setUrl(e.target.value)} />}
        </Campo>
      </div>

      <article className="tarjeta cartel">
        <header>
          <Escudo tamano={56} />
          <div>
            <strong>POLICÍA DE TUCUMÁN</strong>
            <span>{INSTITUCION.portal}</span>
          </div>
        </header>
        <h2>Hacé tu denuncia en línea</h2>
        <p>Escaneá el código con la cámara del celular. Recibís la constancia por correo y seguís el estado desde tu casa.</p>
        {qr && <img src={qr} alt={`Código QR hacia ${url}`} className="cartel-qr" />}
        <div className="cartel-url">{url.replace(/^https?:\/\//, '')}</div>
        <ul>
          <li>Hurtos, robos y robo de motos o autos</li>
          <li>Estafas y estafas virtuales</li>
          <li>Extravío de documentación</li>
        </ul>
        <footer>
          <b>¿Una emergencia?</b> Llamá al <b>911</b> · Violencia de género: <b>144</b>
        </footer>
      </article>
    </>
  );
}
