import type { RouteStep } from '@logiflow/shared-models';
import { mergeRouteUpdate } from './route.utils';

describe('mergeRouteUpdate', () => {
  it('preserves completed stops when a route update arrives', () => {
    const current = [
      createStep('stop-1', 1, 'completed'),
      createStep('stop-2', 2, 'active'),
      createStep('stop-3', 3, 'pending'),
    ];
    const incoming = [
      createStep('stop-1', 1, 'pending'),
      createStep('stop-2', 2, 'pending'),
      createStep('stop-4', 4, 'pending'),
    ];

    const merged = mergeRouteUpdate(current, incoming);

    expect(merged.find((step) => step.stopId === 'stop-1')?.status).toBe('completed');
  });

  it('replaces pending steps with incoming steps', () => {
    const current = [createStep('stop-2', 2, 'pending')];
    const incoming = [createStep('stop-2', 5, 'active')];

    const merged = mergeRouteUpdate(current, incoming);

    expect(merged).toEqual([createStep('stop-2', 5, 'active')]);
  });

  it('returns steps sorted by arrivalOrder', () => {
    const current = [createStep('stop-3', 3, 'completed')];
    const incoming = [createStep('stop-2', 2, 'active'), createStep('stop-4', 4, 'pending')];

    const merged = mergeRouteUpdate(current, incoming);

    expect(merged.map((step) => step.arrivalOrder)).toEqual([2, 3, 4]);
  });

  it('returns expected count when some stops are completed', () => {
    const current = [
      createStep('stop-1', 1, 'completed'),
      createStep('stop-2', 2, 'completed'),
      createStep('stop-3', 3, 'pending'),
    ];
    const incoming = [
      createStep('stop-3', 3, 'active'),
      createStep('stop-4', 4, 'pending'),
      createStep('stop-5', 5, 'pending'),
    ];

    const merged = mergeRouteUpdate(current, incoming);

    expect(merged).toHaveSize(5);
    expect(merged.filter((step) => step.status === 'completed')).toHaveSize(2);
  });
});

function createStep(
  stopId: string,
  arrivalOrder: number,
  status: RouteStep['status'],
): RouteStep {
  return {
    stopId,
    address: `${stopId} address`,
    lat: 4.6 + arrivalOrder,
    lng: -74.0 - arrivalOrder,
    arrivalOrder,
    status,
  };
}
