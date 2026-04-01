import type { RouteStep } from '@logiflow/shared-models';

export function mergeRouteUpdate(current: RouteStep[], incoming: RouteStep[]): RouteStep[] {
  const completedSteps = current.filter(isCompletedRouteStep);
  const completedStopIdSet = new Set(completedSteps.map(mapRouteStepToStopId));

  const incomingWithoutCompleted = incoming.filter(
    (step) => !completedStopIdSet.has(step.stopId),
  );

  return [...completedSteps, ...incomingWithoutCompleted].sort(compareRouteStepsByArrivalOrder);
}

function isCompletedRouteStep(step: RouteStep): boolean {
  return step.status === 'completed';
}

function mapRouteStepToStopId(step: RouteStep): string {
  return step.stopId;
}

function compareRouteStepsByArrivalOrder(left: RouteStep, right: RouteStep): number {
  return left.arrivalOrder - right.arrivalOrder;
}