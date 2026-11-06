export type TipoDelito =
  | 'Hurto' | 'Robo' | 'RoboAutomotor' | 'RoboMotocicleta' | 'Danos' | 'Amenazas' | 'Lesiones'
  | 'Estafa' | 'EstafaVirtual' | 'ViolenciaFamiliar' | 'ExtravioDocumentacion' | 'Otro';

export type EstadoDenuncia =
  | 'Recibida' | 'Asignada' | 'EnInvestigacion' | 'ElevadaFiscalia' | 'Resuelta' | 'Archivada' | 'Desestimada';

export type Prioridad = 'Baja' | 'Media' | 'Alta' | 'Urgente';
export type Origen = 'Web' | 'Presencial';
export type TipoActuacion = 'Registro' | 'CambioEstado' | 'Asignacion' | 'Derivacion' | 'Nota' | 'Adjunto';
export type Rol = 'Administrador' | 'JefeDependencia' | 'Operador';
export type SituacionRevista = 'ServicioEfectivo' | 'Licencia' | 'Disponibilidad' | 'Pasiva';
export type TipoDependencia = 'Comisaria' | 'Subcomisaria' | 'Destacamento' | 'Division' | 'Direccion';
export type TipoMovil = 'Automovil' | 'Camioneta' | 'Motocicleta' | 'Utilitario';
export type EstadoMovil = 'Operativo' | 'EnPatrullaje' | 'EnTaller' | 'FueraDeServicio';
export type EstadoCorreo = 'Pendiente' | 'Enviado' | 'Fallido';
export type Jerarquia =
  | 'Agente' | 'Cabo' | 'CaboPrimero' | 'Sargento' | 'SargentoPrimero' | 'SargentoAyudante' | 'SuboficialPrincipal'
  | 'SuboficialMayor' | 'OficialAyudante' | 'OficialSubinspector' | 'OficialInspector' | 'OficialPrincipal'
  | 'Subcomisario' | 'Comisario' | 'ComisarioInspector' | 'ComisarioMayor' | 'ComisarioGeneral';

export interface Pagina<T> {
  items: T[];
  total: number;
  numero: number;
  tamano: number;
  totalPaginas: number;
}

export interface Sesion {
  id: number;
  legajo: string;
  nombre: string;
  apellido: string;
  jerarquia: Jerarquia;
  rol: Rol;
  dependencia: { id: number; nombre: string };
  debeCambiarPassword: boolean;
  ultimoAcceso: string | null;
  vence: string;
}

export interface ConfiguracionPublica {
  modoDemo: boolean;
  passwordDemo: string | null;
  accesosDemo: { legajo: string; perfil: string; descripcion: string }[];
}

export interface DependenciaContacto {
  id: number;
  nombre: string;
  direccion: string;
  localidad: string;
  telefono: string | null;
}

export interface DependenciaPublica extends DependenciaContacto {
  tipo: TipoDependencia;
  unidadRegional: string;
  latitud: number | null;
  longitud: number | null;
}

export interface Comprobante {
  id: number;
  numero: string;
  codigoSeguimiento: string;
  fecha: string;
  tipo: TipoDelito;
  denunciante: string;
  dependencia: DependenciaContacto | null;
  correoEnviado: boolean;
  adjuntos: number;
}

export interface Seguimiento {
  numero: string;
  tipo: TipoDelito;
  estado: EstadoDenuncia;
  fechaDenuncia: string;
  fechaHecho: string;
  denunciante: string;
  dependencia: DependenciaContacto | null;
  movimientos: { fecha: string; descripcion: string; estado: EstadoDenuncia | null }[];
}

export interface DenunciaItem {
  id: number;
  numero: string;
  tipo: TipoDelito;
  estado: EstadoDenuncia;
  prioridad: Prioridad;
  origen: Origen;
  denunciante: string;
  dni: string;
  lugarHecho: string;
  localidad: string;
  fechaHecho: string;
  creadaEn: string;
  dependencia: string | null;
  instructor: string | null;
}

export interface Actuacion {
  id: number;
  tipo: TipoActuacion;
  fecha: string;
  descripcion: string;
  informadaAlDenunciante: boolean;
  estadoAnterior: EstadoDenuncia | null;
  estadoNuevo: EstadoDenuncia | null;
  usuario: string | null;
}

export interface Adjunto {
  id: number;
  nombre: string;
  contentType: string;
  tamanoBytes: number;
  subidoEn: string;
  aportadoPorDenunciante: boolean;
}

export interface DenunciaDetalle {
  id: number;
  numero: string;
  codigoSeguimiento: string;
  tipo: TipoDelito;
  estado: EstadoDenuncia;
  prioridad: Prioridad;
  origen: Origen;
  denunciante: {
    nombre: string; apellido: string; dni: string; fechaNacimiento: string | null;
    telefono: string | null; email: string | null; domicilio: string; localidad: string;
  };
  fechaHecho: string;
  lugarHecho: string;
  localidad: string;
  latitud: number | null;
  longitud: number | null;
  relato: string;
  bienesInvolucrados: string | null;
  dependencia: DependenciaContacto | null;
  instructor: { id: number; legajo: string; nombre: string; jerarquia: Jerarquia } | null;
  creadaEn: string;
  actualizadaEn: string;
  cerradaEn: string | null;
  actuaciones: Actuacion[];
  adjuntos: Adjunto[];
  estadosSiguientes: EstadoDenuncia[];
  permisos: { operar: boolean; asignar: boolean; derivar: boolean };
}

export interface PuntoMapa {
  id: number;
  numero: string;
  tipo: TipoDelito;
  estado: EstadoDenuncia;
  prioridad: Prioridad;
  lat: number;
  lng: number;
  fechaHecho: string;
}

export interface Cantidad { clave: string; cantidad: number }

export interface Panel {
  dias: number;
  alcance: string;
  indicadores: {
    total: number;
    abiertas: number;
    sinInstructor: number;
    urgentes: number;
    ultimas24Horas: number;
    cerradasEnPeriodo: number;
    horasPromedioAsignacion: number | null;
    porcentajeWeb: number;
  };
  serie: { fecha: string; recibidas: number; cerradas: number }[];
  porTipo: Cantidad[];
  porEstado: Cantidad[];
  porUnidadRegional: Cantidad[];
  porDependencia: Cantidad[];
  porFranjaHoraria: Cantidad[];
  recientes: {
    id: number; numero: string; tipo: TipoDelito; prioridad: Prioridad; estado: EstadoDenuncia;
    dependencia: string | null; creadaEn: string; origen: Origen;
  }[];
}

export interface UnidadRegional { id: number; codigo: string; nombre: string; cabecera: string }

export interface Dependencia {
  id: number;
  nombre: string;
  tipo: TipoDependencia;
  unidadRegionalId: number;
  unidadRegional: string;
  direccion: string;
  localidad: string;
  telefono: string | null;
  email: string | null;
  latitud: number | null;
  longitud: number | null;
  recibeDenuncias: boolean;
  activa: boolean;
  personal: number;
  moviles: number;
  denunciasAbiertas: number;
}

export interface PersonalItem {
  id: number;
  legajo: string;
  apellido: string;
  nombre: string;
  dni: string;
  jerarquia: Jerarquia;
  situacion: SituacionRevista;
  dependenciaId: number;
  dependencia: string;
  email: string | null;
  telefono: string | null;
  fechaIngreso: string;
  rol: Rol | null;
}

export interface Instructor { id: number; legajo: string; nombre: string; jerarquia: Jerarquia; denunciasAbiertas: number }

export interface Movil {
  id: number;
  numeroInterno: string;
  dominio: string;
  tipo: TipoMovil;
  marca: string;
  modelo: string;
  anio: number;
  estado: EstadoMovil;
  dependenciaId: number;
  dependencia: string;
  kilometraje: number;
  observaciones: string | null;
}

export interface Usuario {
  id: number;
  personalId: number;
  legajo: string;
  nombre: string;
  jerarquia: Jerarquia;
  dependencia: string;
  email: string | null;
  rol: Rol;
  activo: boolean;
  bloqueado: boolean;
  debeCambiarPassword: boolean;
  creadoEn: string;
  ultimoAcceso: string | null;
}

export interface CredencialTemporal { usuarioId: number; legajo: string; passwordTemporal: string; correoEnviado: boolean }

export interface RegistroAuditoria {
  id: number; fecha: string; usuario: string; accion: string; entidad: string;
  entidadId: string | null; detalle: string | null; ip: string | null;
}

export interface Correo {
  id: number; destinatario: string; plantilla: string; referencia: string | null; estado: EstadoCorreo;
  intentos: number; creadoEn: string; enviadoEn: string | null; ultimoError: string | null;
}

export interface AvisoDenuncia {
  id: number; numero: string; tipo: TipoDelito; prioridad: Prioridad; estado: EstadoDenuncia;
  dependencia: string | null; origen: Origen;
}
