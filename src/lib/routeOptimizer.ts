import {
  Stop,
  RouteSegment,
  OptimizedRoute,
  OptimizedStop,
  TravelMode,
} from "./types";
import { getRouteSegment, formatDuration } from "./googleMaps";

interface OptimizationOptions {
  startTime: string; // HH:MM format
  travelMode: TravelMode;
  fixFirstStop?: boolean; // Keep first stop in place (e.g., hotel)
  fixLastStop?: boolean; // Keep last stop in place (e.g., hotel)
}

/**
 * Optimize the order of stops using a greedy nearest-neighbor algorithm
 * with awareness of opening hours and travel times.
 */
export async function optimizeRoute(
  stops: Stop[],
  existingSegments: RouteSegment[],
  options: OptimizationOptions
): Promise<OptimizedRoute> {
  console.log("optimizeRoute called with", stops.length, "stops");

  if (stops.length < 2) {
    console.log("Less than 2 stops, returning simple route");
    return createSimpleRoute(stops, options.startTime);
  }

  const warnings: string[] = [];
  const optimizedStops: OptimizedStop[] = [];

  // Create a map of existing route segments for quick lookup
  const segmentMap = new Map<string, RouteSegment>();
  existingSegments.forEach((seg) => {
    const key = `${seg.from_stop_id}-${seg.to_stop_id}`;
    segmentMap.set(key, seg);
  });

  // Start with the first stop (or find best starting point)
  const unvisited = new Set(stops.map((s) => s.id));
  let currentStop = stops[0];
  let currentTime = parseTime(options.startTime);

  // If first stop is fixed, use it; otherwise find optimal start
  if (options.fixFirstStop) {
    unvisited.delete(currentStop.id);
  } else {
    // Find stop that opens earliest
    const earliestOpen = findEarliestOpenStop(stops, currentTime);
    if (earliestOpen) {
      currentStop = earliestOpen;
    }
    unvisited.delete(currentStop.id);
  }

  // Add first stop
  const firstStopDeparture = addDuration(
    currentTime,
    currentStop.estimated_duration_minutes || 60
  );

  optimizedStops.push({
    stop: currentStop,
    arrivalTime: formatTime(currentTime),
    departureTime: formatTime(firstStopDeparture),
  });

  currentTime = firstStopDeparture;

  // Greedy nearest neighbor with opening hours awareness
  console.log("Starting optimization loop, unvisited:", unvisited.size);
  while (unvisited.size > 0) {
    console.log("Finding best next stop from", currentStop.name);
    const { nextStop, segment, warning } = await findBestNextStop(
      currentStop,
      Array.from(unvisited)
        .map((id) => stops.find((s) => s.id === id)!)
        .filter(Boolean),
      currentTime,
      segmentMap,
      options
    );

    console.log("Best next stop result:", nextStop?.name, "segment:", !!segment);

    if (!nextStop) {
      // No reachable stops found - add remaining stops in order
      console.log("No next stop found, breaking loop");
      warnings.push("Some stops may not be reachable during opening hours");
      break;
    }

    if (warning) {
      warnings.push(warning);
    }

    unvisited.delete(nextStop.id);

    // Calculate arrival time
    const travelTime = segment?.duration_seconds
      ? Math.ceil(segment.duration_seconds / 60)
      : 30; // Default 30 min if unknown
    const arrivalTime = addDuration(currentTime, travelTime);

    // Check if we need to wait for opening
    const waitTime = getWaitTimeUntilOpen(nextStop, arrivalTime);
    const effectiveArrival =
      waitTime > 0 ? addDuration(arrivalTime, waitTime) : arrivalTime;

    if (waitTime > 30) {
      warnings.push(
        `${nextStop.name} opens later - ${waitTime} min wait time`
      );
    }

    const departureTime = addDuration(
      effectiveArrival,
      nextStop.estimated_duration_minutes || 60
    );

    optimizedStops.push({
      stop: nextStop,
      arrivalTime: formatTime(effectiveArrival),
      departureTime: formatTime(departureTime),
      travelFromPrevious: segment || undefined,
    });

    currentStop = nextStop;
    currentTime = departureTime;
  }

  // Add any remaining unvisited stops at the end
  for (const stopId of unvisited) {
    const stop = stops.find((s) => s.id === stopId);
    if (stop) {
      const segment = await getOrFetchSegment(
        currentStop,
        stop,
        segmentMap,
        options.travelMode
      );

      const travelTime = segment?.duration_seconds
        ? Math.ceil(segment.duration_seconds / 60)
        : 30;
      const arrivalTime = addDuration(currentTime, travelTime);
      const departureTime = addDuration(
        arrivalTime,
        stop.estimated_duration_minutes || 60
      );

      optimizedStops.push({
        stop,
        arrivalTime: formatTime(arrivalTime),
        departureTime: formatTime(departureTime),
        travelFromPrevious: segment || undefined,
      });

      currentStop = stop;
      currentTime = departureTime;
    }
  }

  // Calculate totals
  const { totalDuration, walkingTime, transitTime } =
    calculateTotals(optimizedStops);

  return {
    stops: optimizedStops,
    totalDurationMinutes: totalDuration,
    totalWalkingMinutes: walkingTime,
    totalTransitMinutes: transitTime,
    warnings,
  };
}

/**
 * Find the best next stop considering travel time and opening hours
 */
async function findBestNextStop(
  currentStop: Stop,
  candidates: Stop[],
  currentTime: number,
  segmentMap: Map<string, RouteSegment>,
  options: OptimizationOptions
): Promise<{
  nextStop: Stop | null;
  segment: RouteSegment | null;
  warning?: string;
}> {
  console.log("findBestNextStop: evaluating", candidates.length, "candidates");
  let bestStop: Stop | null = null;
  let bestSegment: RouteSegment | null = null;
  let bestScore = Infinity;
  let warning: string | undefined;

  for (const candidate of candidates) {
    console.log("Fetching segment from", currentStop.name, "to", candidate.name);
    const segment = await getOrFetchSegment(
      currentStop,
      candidate,
      segmentMap,
      options.travelMode
    );
    console.log("Segment result:", segment ? `${segment.duration_seconds}s` : "null");

    const travelTime = segment?.duration_seconds
      ? Math.ceil(segment.duration_seconds / 60)
      : 30;
    const arrivalTime = addDuration(currentTime, travelTime);

    // Check if stop is open when we arrive
    const waitTime = getWaitTimeUntilOpen(candidate, arrivalTime);
    const closingWarning = getClosingWarning(candidate, arrivalTime);

    // Score: travel time + wait time (penalize long waits)
    const score = travelTime + waitTime * 1.5;

    if (score < bestScore) {
      bestScore = score;
      bestStop = candidate;
      bestSegment = segment;
      warning = closingWarning;
    }
  }

  return { nextStop: bestStop, segment: bestSegment, warning };
}

/**
 * Get or fetch a route segment between two stops
 */
async function getOrFetchSegment(
  from: Stop,
  to: Stop,
  segmentMap: Map<string, RouteSegment>,
  mode: TravelMode
): Promise<RouteSegment | null> {
  const key = `${from.id}-${to.id}`;
  const existing = segmentMap.get(key);

  if (existing) {
    return existing;
  }

  // Fetch from API and cache
  const segment = await getRouteSegment(from, to, mode);
  if (segment) {
    segmentMap.set(key, segment);
  }
  return segment;
}

/**
 * Calculate wait time in minutes until a stop opens
 */
function getWaitTimeUntilOpen(stop: Stop, arrivalTime: number): number {
  if (!stop.opening_hours?.periods) {
    return 0; // Assume always open if no data
  }

  const day = new Date().getDay(); // 0 = Sunday
  const todayPeriod = stop.opening_hours.periods.find(
    (p) => p.open.day === day
  );

  if (!todayPeriod) {
    return 0; // Closed today or no data
  }

  const openTime = parseTime(todayPeriod.open.time);
  if (arrivalTime < openTime) {
    return openTime - arrivalTime;
  }

  return 0;
}

/**
 * Check if stop will be closing soon after arrival
 */
function getClosingWarning(stop: Stop, arrivalTime: number): string | undefined {
  if (!stop.opening_hours?.periods) {
    return undefined;
  }

  const day = new Date().getDay();
  const todayPeriod = stop.opening_hours.periods.find(
    (p) => p.open.day === day
  );

  if (!todayPeriod?.close) {
    return undefined;
  }

  const closeTime = parseTime(todayPeriod.close.time);
  const stayDuration = stop.estimated_duration_minutes || 60;
  const departureTime = addDuration(arrivalTime, stayDuration);

  if (departureTime > closeTime) {
    return `${stop.name} closes at ${todayPeriod.close.time} - may not have enough time`;
  }

  if (closeTime - arrivalTime < 30) {
    return `${stop.name} closes soon - tight timing`;
  }

  return undefined;
}

/**
 * Find the stop that opens earliest
 */
function findEarliestOpenStop(stops: Stop[], currentTime: number): Stop | null {
  let earliest: Stop | null = null;
  let earliestOpen = Infinity;

  for (const stop of stops) {
    const waitTime = getWaitTimeUntilOpen(stop, currentTime);
    const effectiveOpen = currentTime + waitTime;

    if (effectiveOpen < earliestOpen) {
      earliestOpen = effectiveOpen;
      earliest = stop;
    }
  }

  return earliest;
}

/**
 * Create a simple route without optimization (for 1-2 stops)
 */
function createSimpleRoute(
  stops: Stop[],
  startTime: string
): OptimizedRoute {
  let currentTime = parseTime(startTime);
  const optimizedStops: OptimizedStop[] = [];

  for (const stop of stops) {
    const departureTime = addDuration(
      currentTime,
      stop.estimated_duration_minutes || 60
    );

    optimizedStops.push({
      stop,
      arrivalTime: formatTime(currentTime),
      departureTime: formatTime(departureTime),
    });

    currentTime = departureTime + 30; // Assume 30 min travel between
  }

  const totalMinutes =
    parseTime(optimizedStops[optimizedStops.length - 1]?.departureTime || startTime) -
    parseTime(startTime);

  return {
    stops: optimizedStops,
    totalDurationMinutes: totalMinutes,
    totalWalkingMinutes: 0,
    totalTransitMinutes: 0,
    warnings: [],
  };
}

/**
 * Calculate total times from optimized stops
 */
function calculateTotals(stops: OptimizedStop[]): {
  totalDuration: number;
  walkingTime: number;
  transitTime: number;
} {
  if (stops.length === 0) {
    return { totalDuration: 0, walkingTime: 0, transitTime: 0 };
  }

  const firstArrival = parseTime(stops[0].arrivalTime);
  const lastDeparture = parseTime(stops[stops.length - 1].departureTime);
  const totalDuration = lastDeparture - firstArrival;

  let walkingTime = 0;
  let transitTime = 0;

  for (const stop of stops) {
    if (stop.travelFromPrevious?.duration_seconds) {
      const minutes = Math.ceil(stop.travelFromPrevious.duration_seconds / 60);
      if (stop.travelFromPrevious.travel_mode === "walking") {
        walkingTime += minutes;
      } else {
        transitTime += minutes;
      }
    }
  }

  return { totalDuration, walkingTime, transitTime };
}

// ============================================
// TIME UTILITIES
// ============================================

/**
 * Parse time string (HH:MM or HHMM) to minutes since midnight
 */
function parseTime(time: string): number {
  if (time.includes(":")) {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  }
  // HHMM format
  const hours = parseInt(time.slice(0, 2));
  const minutes = parseInt(time.slice(2));
  return hours * 60 + minutes;
}

/**
 * Format minutes since midnight to HH:MM
 */
function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/**
 * Add minutes to a time
 */
function addDuration(timeMinutes: number, durationMinutes: number): number {
  return timeMinutes + durationMinutes;
}

/**
 * Format optimized route as a readable timeline
 */
export function formatRouteTimeline(route: OptimizedRoute): string {
  const lines: string[] = [];

  for (let i = 0; i < route.stops.length; i++) {
    const stop = route.stops[i];
    const travel = stop.travelFromPrevious;

    if (travel && i > 0) {
      lines.push(
        `  ↓ ${formatDuration(travel.duration_seconds || 0)} by ${travel.travel_mode}`
      );
    }

    lines.push(
      `${stop.arrivalTime} - ${stop.departureTime}: ${stop.stop.name}`
    );
  }

  lines.push("");
  lines.push(`Total: ${formatDuration(route.totalDurationMinutes * 60)}`);

  if (route.warnings.length > 0) {
    lines.push("");
    lines.push("Warnings:");
    route.warnings.forEach((w) => lines.push(`  ⚠️ ${w}`));
  }

  return lines.join("\n");
}
