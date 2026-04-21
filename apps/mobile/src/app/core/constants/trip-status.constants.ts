import { StatusIconConstants } from './icons.constants';

export const TripStatusConstants = {
  inTransit: 'in_transit',
  atStop: 'at_stop',
  delivered: 'delivered',
} as const;

export type TripStatus =
  (typeof TripStatusConstants)[keyof typeof TripStatusConstants];

export const TripStatusDisplayConstants: Record<
  TripStatus,
  { label: string; color: string; icon: string }
> = {
  in_transit: {
    label: 'In transit',
    color: 'success',
    icon: StatusIconConstants.inTransit,
  },
  at_stop: {
    label: 'At stop',
    color: 'warning',
    icon: StatusIconConstants.atStop,
  },
  delivered: {
    label: 'Delivered',
    color: 'primary',
    icon: StatusIconConstants.completed,
  },
};
