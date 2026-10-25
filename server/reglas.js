// Reglas de negocio puras (sin base de datos), fáciles de testear.

// Argentina no usa horario de verano: UTC-3 fijo.
const OFFSET_AR_MS = -3 * 60 * 60 * 1000;

const FORMATOS_PATENTE = [
  /^[A-Z]{3}\d{3}$/, // auto, formato 1995 (ABC123)
  /^[A-Z]{2}\d{3}[A-Z]{2}$/, // auto, formato Mercosur (AB123CD)
  /^\d{3}[A-Z]{3}$/, // moto, formato anterior (123ABC)
  /^[A-Z]\d{3}[A-Z]{3}$/, // moto, formato Mercosur (A123BCD)
];

export function normalizarPatente(valor) {
  return String(valor ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function patenteValida(valor) {
  const p = normalizarPatente(valor);
  return FORMATOS_PATENTE.some((re) => re.test(p));
}

/** Minutos a cobrar: se respeta un mínimo y se redondea hacia arriba a la fracción. */
export function minutosFacturables(minutosReales, { fraccion_minutos = 15, minimo_minutos = 30 } = {}) {
  const reales = Math.max(0, Math.ceil(minutosReales));
  const fraccionados = Math.ceil(reales / fraccion_minutos) * fraccion_minutos;
  return Math.max(minimo_minutos, fraccionados);
}

export function calcularMonto(minutosReales, tarifaHora, params) {
  return Math.round((minutosFacturables(minutosReales, params) / 60) * tarifaHora);
}

export function minutosEntre(inicioIso, finIso = new Date().toISOString()) {
  return Math.max(0, (Date.parse(finIso) - Date.parse(inicioIso)) / 60000);
}

/** Instante UTC (ISO) en que empieza el día local argentino que contiene `fecha`. */
export function inicioDiaLocal(fecha = new Date(), diasAtras = 0) {
  const local = new Date(fecha.getTime() + OFFSET_AR_MS);
  local.setUTCHours(0, 0, 0, 0);
  local.setUTCDate(local.getUTCDate() - diasAtras);
  return new Date(local.getTime() - OFFSET_AR_MS).toISOString();
}

/** Fecha local argentina (YYYY-MM-DD) de un instante ISO. */
export function fechaLocal(iso) {
  return new Date(Date.parse(iso) + OFFSET_AR_MS).toISOString().slice(0, 10);
}

/** Reparte un monto según los porcentajes de distribución; el redondeo se ajusta en el primer rubro. */
export function distribuir(monto, params) {
  const rubros = [
    ['trabajadores', 'Trabajadores/as cooperativistas', params.dist_trabajadores],
    ['municipio', 'Municipalidad (canon)', params.dist_municipio],
    ['fondo_solidario', 'Fondo solidario y capacitación', params.dist_fondo_solidario],
    ['tecnologia', 'Mantenimiento tecnológico', params.dist_tecnologia],
  ].map(([clave, nombre, pct]) => ({ clave, nombre, porcentaje: Number(pct), monto: Math.floor((monto * Number(pct)) / 100) }));
  const resto = monto - rubros.reduce((s, r) => s + r.monto, 0);
  rubros[0].monto += resto;
  return rubros;
}

/** Instante UTC (ISO) en que empieza el mes local argentino que contiene `fecha`. */
export function inicioMesLocal(fecha = new Date()) {
  const local = new Date(fecha.getTime() + OFFSET_AR_MS);
  local.setUTCDate(1);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - OFFSET_AR_MS).toISOString();
}
