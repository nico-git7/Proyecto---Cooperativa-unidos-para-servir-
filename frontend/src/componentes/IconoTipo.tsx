import {
  Banknote, Bike, Car, CircleHelp, HeartPulse, Hammer, IdCard, MessageSquareWarning, ShieldAlert, Smartphone, Users, Wallet,
  type LucideIcon, type LucideProps,
} from 'lucide-react';
import type { TipoDelito } from '@/api/tipos';

const ICONOS: Record<TipoDelito, LucideIcon> = {
  Hurto: Wallet,
  Robo: ShieldAlert,
  RoboMotocicleta: Bike,
  RoboAutomotor: Car,
  EstafaVirtual: Smartphone,
  Estafa: Banknote,
  Amenazas: MessageSquareWarning,
  Danos: Hammer,
  Lesiones: HeartPulse,
  ViolenciaFamiliar: Users,
  ExtravioDocumentacion: IdCard,
  Otro: CircleHelp,
};

export function IconoTipo({ tipo, ...props }: { tipo: TipoDelito } & LucideProps) {
  const Icono = ICONOS[tipo] ?? CircleHelp;
  return <Icono aria-hidden {...props} />;
}
