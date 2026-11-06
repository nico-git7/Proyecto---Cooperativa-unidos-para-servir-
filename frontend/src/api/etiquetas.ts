import type {
  EstadoDenuncia, EstadoMovil, Jerarquia, Origen, Prioridad, Rol, SituacionRevista, TipoDelito, TipoDependencia, TipoMovil,
} from './tipos';

export const TIPOS_DELITO: Record<TipoDelito, { nombre: string; descripcion: string }> = {
  Hurto: { nombre: 'Hurto', descripcion: 'Te sacaron algo sin violencia ni amenazas.' },
  Robo: { nombre: 'Robo', descripcion: 'Te sustrajeron pertenencias con violencia o intimidación.' },
  RoboMotocicleta: { nombre: 'Robo de motocicleta', descripcion: 'Sustracción de moto o ciclomotor.' },
  RoboAutomotor: { nombre: 'Robo de automotor', descripcion: 'Sustracción de auto, camioneta o utilitario.' },
  EstafaVirtual: { nombre: 'Estafa virtual', descripcion: 'Engaños por WhatsApp, redes, compras o cuentas bancarias.' },
  Estafa: { nombre: 'Estafa', descripcion: 'Te engañaron para entregar dinero o bienes.' },
  Amenazas: { nombre: 'Amenazas', descripcion: 'Alguien te intimidó con causarte un daño.' },
  Danos: { nombre: 'Daños', descripcion: 'Rotura o destrucción de bienes de tu propiedad.' },
  Lesiones: { nombre: 'Lesiones', descripcion: 'Agresión física que no está ocurriendo ahora.' },
  ViolenciaFamiliar: { nombre: 'Violencia familiar', descripcion: 'Agresiones dentro del ámbito familiar o de pareja.' },
  ExtravioDocumentacion: { nombre: 'Extravío de documentación', descripcion: 'Pérdida de DNI, licencia, cédula u otros documentos.' },
  Otro: { nombre: 'Otro hecho', descripcion: 'Un hecho que no figura en las opciones anteriores.' },
};

export const ORDEN_TIPOS = Object.keys(TIPOS_DELITO) as TipoDelito[];

/** Tipos en los que tiene sentido pedir la descripción de bienes involucrados. */
export const TIPOS_CON_BIENES: TipoDelito[] = ['Hurto', 'Robo', 'RoboMotocicleta', 'RoboAutomotor', 'Estafa', 'EstafaVirtual', 'Danos', 'ExtravioDocumentacion'];

type Tono = 'gris' | 'azul' | 'ambar' | 'turquesa' | 'verde' | 'rojo' | 'marino';

export const ESTADOS: Record<EstadoDenuncia, { nombre: string; tono: Tono }> = {
  Recibida: { nombre: 'Recibida', tono: 'gris' },
  Asignada: { nombre: 'Asignada', tono: 'azul' },
  EnInvestigacion: { nombre: 'En investigación', tono: 'ambar' },
  ElevadaFiscalia: { nombre: 'Elevada a Fiscalía', tono: 'turquesa' },
  Resuelta: { nombre: 'Resuelta', tono: 'verde' },
  Archivada: { nombre: 'Archivada', tono: 'gris' },
  Desestimada: { nombre: 'Desestimada', tono: 'rojo' },
};

export const ORDEN_ESTADOS = Object.keys(ESTADOS) as EstadoDenuncia[];
export const ESTADOS_CERRADOS: EstadoDenuncia[] = ['Resuelta', 'Archivada', 'Desestimada'];

export const PRIORIDADES: Record<Prioridad, { nombre: string; color: string }> = {
  Baja: { nombre: 'Baja', color: '#97a1af' },
  Media: { nombre: 'Media', color: '#2b7bc0' },
  Alta: { nombre: 'Alta', color: '#d48806' },
  Urgente: { nombre: 'Urgente', color: '#c0392b' },
};

export const ORIGENES: Record<Origen, string> = { Web: 'Comisaría Virtual', Presencial: 'Presencial' };

export const ROLES: Record<Rol, string> = {
  Administrador: 'Administrador',
  JefeDependencia: 'Jefe de dependencia',
  Operador: 'Operador',
};

export const JERARQUIAS: Record<Jerarquia, string> = {
  Agente: 'Agente',
  Cabo: 'Cabo',
  CaboPrimero: 'Cabo Primero',
  Sargento: 'Sargento',
  SargentoPrimero: 'Sargento Primero',
  SargentoAyudante: 'Sargento Ayudante',
  SuboficialPrincipal: 'Suboficial Principal',
  SuboficialMayor: 'Suboficial Mayor',
  OficialAyudante: 'Oficial Ayudante',
  OficialSubinspector: 'Oficial Subinspector',
  OficialInspector: 'Oficial Inspector',
  OficialPrincipal: 'Oficial Principal',
  Subcomisario: 'Subcomisario',
  Comisario: 'Comisario',
  ComisarioInspector: 'Comisario Inspector',
  ComisarioMayor: 'Comisario Mayor',
  ComisarioGeneral: 'Comisario General',
};

export const JERARQUIAS_ABREV: Partial<Record<Jerarquia, string>> = {
  OficialAyudante: 'Of. Ayte.',
  OficialSubinspector: 'Of. Subinsp.',
  OficialInspector: 'Of. Insp.',
  OficialPrincipal: 'Of. Ppal.',
  Subcomisario: 'Subcrio.',
  Comisario: 'Crio.',
  ComisarioInspector: 'Crio. Insp.',
  ComisarioMayor: 'Crio. My.',
  ComisarioGeneral: 'Crio. Gral.',
  SargentoPrimero: 'Sgto. 1°',
  SargentoAyudante: 'Sgto. Ayte.',
  CaboPrimero: 'Cabo 1°',
};

export const SITUACIONES: Record<SituacionRevista, { nombre: string; tono: Tono }> = {
  ServicioEfectivo: { nombre: 'Servicio efectivo', tono: 'verde' },
  Licencia: { nombre: 'Licencia', tono: 'ambar' },
  Disponibilidad: { nombre: 'Disponibilidad', tono: 'azul' },
  Pasiva: { nombre: 'Pasiva', tono: 'gris' },
};

export const TIPOS_DEPENDENCIA: Record<TipoDependencia, string> = {
  Comisaria: 'Comisaría',
  Subcomisaria: 'Subcomisaría',
  Destacamento: 'Destacamento',
  Division: 'División',
  Direccion: 'Dirección',
};

export const TIPOS_MOVIL: Record<TipoMovil, string> = {
  Automovil: 'Automóvil',
  Camioneta: 'Camioneta',
  Motocicleta: 'Motocicleta',
  Utilitario: 'Utilitario',
};

export const ESTADOS_MOVIL: Record<EstadoMovil, { nombre: string; tono: Tono }> = {
  Operativo: { nombre: 'Operativo', tono: 'verde' },
  EnPatrullaje: { nombre: 'En patrullaje', tono: 'azul' },
  EnTaller: { nombre: 'En taller', tono: 'ambar' },
  FueraDeServicio: { nombre: 'Fuera de servicio', tono: 'rojo' },
};

/**
 * Agrupación para el mapa del delito. En un mapa todos los puntos conviven, por eso se usan tres
 * tonos validados para daltonismo más un gris para el resto, en lugar de un color por tipo.
 */
export const GRUPOS_MAPA: { clave: string; nombre: string; color: string; tipos: TipoDelito[] }[] = [
  { clave: 'propiedad', nombre: 'Robos y hurtos', color: '#2a78d6', tipos: ['Hurto', 'Robo', 'RoboMotocicleta', 'RoboAutomotor'] },
  { clave: 'estafas', nombre: 'Estafas', color: '#eb6834', tipos: ['Estafa', 'EstafaVirtual'] },
  { clave: 'personas', nombre: 'Contra las personas', color: '#1baf7a', tipos: ['Lesiones', 'Amenazas', 'ViolenciaFamiliar'] },
  { clave: 'otros', nombre: 'Daños, extravíos y otros', color: '#8a94a3', tipos: ['Danos', 'ExtravioDocumentacion', 'Otro'] },
];

export const grupoDeTipo = (tipo: TipoDelito) => GRUPOS_MAPA.find((g) => g.tipos.includes(tipo)) ?? GRUPOS_MAPA[3];

/** Series del gráfico temporal del panel (par adyacente validado). */
export const COLOR_SERIE = { recibidas: '#2a78d6', cerradas: '#eb6834' };

export const nombreTipo = (t: TipoDelito) => TIPOS_DELITO[t]?.nombre ?? t;
export const nombreEstado = (e: EstadoDenuncia) => ESTADOS[e]?.nombre ?? e;
