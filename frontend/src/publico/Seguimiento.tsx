import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Building2, Phone, Search } from 'lucide-react';
import { api, mensajeDeError } from '@/api/cliente';
import { nombreTipo } from '@/api/etiquetas';
import type { EstadoDenuncia, Seguimiento as DatosSeguimiento } from '@/api/tipos';
import { Aviso, Campo, InsigniaEstado } from '@/componentes/ui';
import { fechaHora } from '@/lib/formato';

const ETAPAS: { estado: EstadoDenuncia; nombre: string }[] = [
  { estado: 'Recibida', nombre: 'Recibida' },
  { estado: 'Asignada', nombre: 'Asignada' },
  { estado: 'EnInvestigacion', nombre: 'Investigación' },
  { estado: 'ElevadaFiscalia', nombre: 'Fiscalía' },
  { estado: 'Resuelta', nombre: 'Concluida' },
];

function formatearCodigo(valor: string) {
  const limpio = valor.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  return limpio.length > 4 ? `${limpio.slice(0, 4)}-${limpio.slice(4)}` : limpio;
}

export default function Seguimiento() {
  const [params] = useSearchParams();
  const [codigo, setCodigo] = useState(formatearCodigo(params.get('codigo') ?? ''));
  const [dni, setDni] = useState('');
  const [errores, setErrores] = useState<{ codigo?: string; dni?: string }>({});

  const consulta = useMutation({
    mutationFn: () => api.post<DatosSeguimiento>('/publico/seguimiento', { codigo, dni }),
  });

  useEffect(() => {
    document.getElementById(codigo ? 'dni-seguimiento' : 'codigo-seguimiento')?.focus();
  }, []);

  const consultar = (e: FormEvent) => {
    e.preventDefault();
    const nuevos: typeof errores = {};
    if (codigo.replace('-', '').length !== 8) nuevos.codigo = 'El código tiene 8 caracteres (ej.: K7M2-QX9P).';
    if (dni.length < 7) nuevos.dni = 'Ingresá el DNI del denunciante.';
    setErrores(nuevos);
    if (!Object.keys(nuevos).length) consulta.mutate();
  };

  const r = consulta.data;

  return (
    <>
      <div className="encabezado-pagina">
        <div className="contenedor">
          <nav className="migas" aria-label="Ruta"><Link to="/">Inicio</Link> / <span>Consultar estado</span></nav>
          <h1>Consultar el estado de una denuncia</h1>
          <p>Ingresá el código de seguimiento que figura en la constancia y el DNI de quien realizó la denuncia.</p>
        </div>
      </div>

      <div className="contenedor cuerpo-pagina">
        <div className="seguimiento-grilla">
          <form className="tarjeta tarjeta-cuerpo" onSubmit={consultar} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Campo etiqueta="Código de seguimiento" requerido error={errores.codigo}>
              {(_, d) => (
                <input id="codigo-seguimiento" aria-describedby={d} aria-invalid={!!errores.codigo} className="entrada mono"
                  placeholder="XXXX-XXXX" autoComplete="off" value={codigo} onChange={(e) => setCodigo(formatearCodigo(e.target.value))}
                  style={{ fontSize: 17, letterSpacing: '0.08em' }} />
              )}
            </Campo>
            <Campo etiqueta="DNI del denunciante" requerido error={errores.dni}>
              {(_, d) => (
                <input id="dni-seguimiento" aria-describedby={d} aria-invalid={!!errores.dni} className="entrada" inputMode="numeric"
                  maxLength={8} value={dni} onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))} />
              )}
            </Campo>
            <button className="btn btn-primario btn-bloque" disabled={consulta.isPending}>
              <Search /> {consulta.isPending ? 'Consultando…' : 'Consultar'}
            </button>
            <p className="texto-chico texto-suave">¿Perdiste el código? Lo encontrás en el correo de confirmación, o podés consultar en la dependencia con tu DNI.</p>
          </form>

          <div>
            {consulta.isError && <Aviso tipo="error">{mensajeDeError(consulta.error)}</Aviso>}
            {!r && !consulta.isError && (
              <div className="tarjeta tarjeta-cuerpo texto-suave" style={{ padding: 32, textAlign: 'center' }}>
                El resultado de la consulta se muestra acá.
              </div>
            )}
            {r && <Resultado r={r} />}
          </div>
        </div>
      </div>
    </>
  );
}

function Resultado({ r }: { r: DatosSeguimiento }) {
  const indice = ETAPAS.findIndex((e) => e.estado === r.estado);
  const cerradaSinResolver = r.estado === 'Archivada' || r.estado === 'Desestimada';

  return (
    <div className="tarjeta">
      <div className="tarjeta-cabecera" style={{ flexWrap: 'wrap' }}>
        <div>
          <div className="mono texto-suave texto-chico">Denuncia N° {r.numero}</div>
          <h2 style={{ fontSize: 19, marginTop: 2 }}>{nombreTipo(r.tipo)}</h2>
        </div>
        <InsigniaEstado estado={r.estado} />
      </div>
      <div className="tarjeta-cuerpo" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {!cerradaSinResolver && (
          <ol className="progreso-estados" aria-label="Etapas del trámite">
            {ETAPAS.map((e, i) => (
              <li key={e.estado} className={`${i <= indice ? 'hecho' : ''} ${i === indice ? 'actual' : ''}`}>{e.nombre}</li>
            ))}
          </ol>
        )}

        <dl className="datos">
          <div><dt>Denunciante</dt><dd>{r.denunciante}</dd></div>
          <div><dt>Fecha de la denuncia</dt><dd>{fechaHora(r.fechaDenuncia)}</dd></div>
          <div><dt>Fecha del hecho</dt><dd>{fechaHora(r.fechaHecho)}</dd></div>
        </dl>

        {r.dependencia && (
          <div className="aviso" style={{ alignItems: 'center' }}>
            <Building2 aria-hidden />
            <div style={{ flex: 1 }}>
              <strong>{r.dependencia.nombre}</strong>
              <div className="texto-chico">{r.dependencia.direccion}, {r.dependencia.localidad}</div>
            </div>
            {r.dependencia.telefono && (
              <a href={`tel:${r.dependencia.telefono.replace(/[^\d]/g, '')}`} className="btn btn-secundario btn-sm"><Phone /> {r.dependencia.telefono}</a>
            )}
          </div>
        )}

        <div>
          <h3 style={{ fontSize: 14, marginBottom: 14 }}>Movimientos</h3>
          <ol className="linea-tiempo">
            {r.movimientos.map((m, i) => (
              <li key={i} className={i === 0 ? 'destacado' : ''}>
                <div className="fecha">{fechaHora(m.fecha)}</div>
                <div className="texto">{m.descripcion}</div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
