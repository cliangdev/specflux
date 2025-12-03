import type { Epic } from "../api";

/**
 * Calculate the phase number for an epic based on its dependencies.
 * Phase 1 = no dependencies
 * Phase N = max(dependency phases) + 1
 */
export function calculatePhase(
  epicId: number,
  epicsMap: Map<number, { dependsOn: number[] }>,
  cache: Map<number, number> = new Map(),
): number {
  // Return cached result if available
  if (cache.has(epicId)) {
    return cache.get(epicId)!;
  }

  const epic = epicsMap.get(epicId);
  if (!epic) {
    return 1;
  }

  const deps = epic.dependsOn;
  if (!deps || deps.length === 0) {
    cache.set(epicId, 1);
    return 1;
  }

  // Calculate max phase of dependencies
  const depPhases = deps.map((depId) => calculatePhase(depId, epicsMap, cache));
  const phase = Math.max(...depPhases) + 1;

  cache.set(epicId, phase);
  return phase;
}

/**
 * Parse depends_on field from Epic (could be JSON string or already parsed)
 */
export function parseDependsOn(dependsOn: unknown): number[] {
  if (!dependsOn) return [];
  if (Array.isArray(dependsOn)) return dependsOn;
  if (typeof dependsOn === "string") {
    try {
      const parsed = JSON.parse(dependsOn);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Group epics by their computed phase
 */
export function groupEpicsByPhase(epics: Epic[]): Map<number, Epic[]> {
  // Build a map for quick lookup
  const epicsMap = new Map<number, { dependsOn: number[] }>();
  for (const epic of epics) {
    epicsMap.set(epic.id, {
      dependsOn: epic.dependsOn ?? [],
    });
  }

  // Calculate phases and group
  const cache = new Map<number, number>();
  const groups = new Map<number, Epic[]>();

  for (const epic of epics) {
    const phase = calculatePhase(epic.id, epicsMap, cache);
    if (!groups.has(phase)) {
      groups.set(phase, []);
    }
    groups.get(phase)!.push(epic);
  }

  return groups;
}

export interface PhaseInfo {
  phaseNumber: number;
  status: "ready" | "in_progress" | "blocked" | "completed";
  epics: Epic[];
  completedCount: number;
  totalCount: number;
}

/**
 * Calculate phase status based on epic statuses and dependency completion
 */
export function calculatePhaseStatus(
  epics: Epic[],
  phaseNumber: number,
  allPhases: Map<number, Epic[]>,
): "ready" | "in_progress" | "blocked" | "completed" {
  if (epics.length === 0) return "ready";

  const completedCount = epics.filter(
    (e) => (e.status as string) === "COMPLETED",
  ).length;
  const activeCount = epics.filter(
    (e) => (e.status as string) === "IN_PROGRESS",
  ).length;

  // All epics completed
  if (completedCount === epics.length) {
    return "completed";
  }

  // Check if any previous phase is incomplete (blocked)
  if (phaseNumber > 1) {
    for (let i = 1; i < phaseNumber; i++) {
      const prevPhaseEpics = allPhases.get(i) ?? [];
      const prevCompleted = prevPhaseEpics.filter(
        (e) => (e.status as string) === "COMPLETED",
      ).length;
      if (prevCompleted < prevPhaseEpics.length) {
        return "blocked";
      }
    }
  }

  // Has active epics
  if (activeCount > 0) {
    return "in_progress";
  }

  return "ready";
}

/**
 * Get complete phase information for all phases
 */
export function getPhaseInfo(epics: Epic[]): PhaseInfo[] {
  const groups = groupEpicsByPhase(epics);
  const phases: PhaseInfo[] = [];

  // Sort phase numbers
  const phaseNumbers = Array.from(groups.keys()).sort((a, b) => a - b);

  for (const phaseNumber of phaseNumbers) {
    const phaseEpics = groups.get(phaseNumber) ?? [];
    phases.push({
      phaseNumber,
      status: calculatePhaseStatus(phaseEpics, phaseNumber, groups),
      epics: phaseEpics,
      completedCount: phaseEpics.filter(
        (e) => (e.status as string) === "COMPLETED",
      ).length,
      totalCount: phaseEpics.length,
    });
  }

  return phases;
}
