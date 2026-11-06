import { Link } from 'react-router-dom';

export default function NoEncontrada() {
  return (
    <div className="contenedor" style={{ padding: '80px 20px', textAlign: 'center' }}>
      <div className="mono texto-suave">Error 404</div>
      <h1 style={{ fontSize: 28, marginTop: 8 }}>La página que buscás no existe</h1>
      <p className="texto-suave" style={{ marginTop: 8 }}>Puede que el enlace esté mal escrito o que la página se haya movido.</p>
      <Link to="/" className="btn btn-primario" style={{ marginTop: 24 }}>Volver al inicio</Link>
    </div>
  );
}
