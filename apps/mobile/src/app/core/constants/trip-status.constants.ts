import { StatusIconConstants } from './icons.constants';

export const TripStatusConstants = {
  enCamino: 'en_camino',
  enParada: 'en_parada',
  entregado: 'entregado',
} as const;

export type TripStatus =
  (typeof TripStatusConstants)[keyof typeof TripStatusConstants];

export const TripStatusDisplayConstants: Record<
  TripStatus,
  { label: string; color: string; icon: string }
> = {
  en_camino: {
    label: 'En camino',
    color: 'success',
    icon: StatusIconConstants.enCamino,
  },
  en_parada: {
    label: 'En parada',
    color: 'warning',
    icon: StatusIconConstants.enParada,
  },
  entregado: {
    label: 'Entregado',
    color: 'primary',
    icon: StatusIconConstants.completed,
  },
};
