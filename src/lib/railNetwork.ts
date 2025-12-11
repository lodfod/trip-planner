/**
 * Japan Rail Network routing using MLIT GIS data.
 * Provides pathfinding for transit routing when Google APIs don't return results.
 */

import { Kuroshiro } from 'kuroshiro-browser';
import { STATION_TRANSLATIONS } from '../data/japanStationTranslations';

// Line color/translation data loaded from JSON (sourced from Wikipedia)
interface LineData {
  color: string;
  en: string;
  operator?: string;
  source?: string;
}
let lineDataCache: Record<string, LineData> | null = null;
let lineDataPromise: Promise<Record<string, LineData>> | null = null;

async function loadLineData(): Promise<Record<string, LineData>> {
  if (lineDataCache) return lineDataCache;
  if (lineDataPromise) return lineDataPromise;

  lineDataPromise = (async () => {
    try {
      const response = await fetch('/japan_line_colors.json');
      if (!response.ok) throw new Error('Failed to load line colors');
      lineDataCache = await response.json();
      console.log(`Loaded ${Object.keys(lineDataCache!).length} line colors from Wikipedia data`);
      return lineDataCache!;
    } catch (e) {
      console.error('Error loading line colors:', e);
      lineDataCache = {};
      return lineDataCache;
    }
  })();

  return lineDataPromise;
}

// Kuroshiro instance for kanji -> romaji conversion (browser-compatible)
let kuroshiro: Kuroshiro | null = null;
let kuroshiroInitPromise: Promise<void> | null = null;

async function initKuroshiro(): Promise<void> {
  if (kuroshiro) return;
  if (kuroshiroInitPromise) return kuroshiroInitPromise;

  kuroshiroInitPromise = (async () => {
    const IS_PROD = import.meta.env.MODE === 'production';
    kuroshiro = await Kuroshiro.buildAndInitWithKuromoji(IS_PROD);
  })();

  return kuroshiroInitPromise;
}

// Cache for converted names
const romajiCache = new Map<string, string>();

/**
 * Convert Japanese text (including kanji) to romaji
 */
async function toRomajiAsync(text: string): Promise<string> {
  // Check cache first
  if (romajiCache.has(text)) {
    return romajiCache.get(text)!;
  }

  try {
    await initKuroshiro();
    if (!kuroshiro) return text;

    const result = await kuroshiro.convert(text, { to: 'romaji', mode: 'spaced' });
    // Capitalize first letter of each word
    const capitalized = result
      .split(' ')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    romajiCache.set(text, capitalized);
    return capitalized;
  } catch (e) {
    console.error('Romaji conversion failed:', e);
    return text;
  }
}

export interface RailStation {
  id: string;
  name: string;
  line: string;
  operator: string;
  lat: number;
  lng: number;
  rail_type: string;
  operator_type: string;
  connections: RailConnection[];
}

export interface RailConnection {
  to: string;
  distance: number;
  line: string;
  transfer?: boolean;
}

export interface RailLine {
  name: string;
  color: string;
  station_count: number;
}

export interface RailNetwork {
  stations: Record<string, RailStation>;
  lines: Record<string, RailLine>;
  line_geometries: Record<string, number[][][]>;
  metadata: {
    total_stations: number;
    total_lines: number;
    total_connections?: number;
    total_transfers?: number;
    region?: string;
  };
}

export interface RouteStep {
  type: 'rail' | 'transfer' | 'walk';
  from: RailStation;
  to: RailStation;
  line?: string;
  lineColor?: string;
  distance: number;
  duration: number; // seconds
  polyline?: string; // encoded polyline
  // For building accurate polylines from track geometry
  intermediateStations?: RailStation[];
}

export interface RailRoute {
  steps: RouteStep[];
  totalDistance: number;
  totalDuration: number;
  transfers: number;
}

// Average speeds for duration estimation
const TRAIN_SPEED_MPS = 40 * 1000 / 3600; // 40 km/h average including stops
const WALK_SPEED_MPS = 5 * 1000 / 3600; // 5 km/h walking
const TRANSFER_TIME = 5 * 60; // 5 minutes for transfers

// Region definitions
type Region = 'tokyo' | 'kansai';

interface RegionBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

const REGION_BOUNDS: Record<Region, RegionBounds> = {
  tokyo: { minLat: 35.5, maxLat: 35.9, minLng: 139.4, maxLng: 140.0 },
  kansai: { minLat: 34.5, maxLat: 35.1, minLng: 135.0, maxLng: 136.0 },
};

const REGION_FILES: Record<Region, string> = {
  tokyo: '/tokyo_rail_network.json',
  kansai: '/kansai_rail_network.json',
};

// Cache loaded network data per region
const networkCache: Record<Region, RailNetwork | null> = {
  tokyo: null,
  kansai: null,
};

const stationIndexCache: Record<Region, Map<string, RailStation[]> | null> = {
  tokyo: null,
  kansai: null,
};

/**
 * Determine which region a coordinate falls into
 */
export function detectRegion(lat: number, lng: number): Region | null {
  for (const [region, bounds] of Object.entries(REGION_BOUNDS) as [Region, RegionBounds][]) {
    if (lat >= bounds.minLat && lat <= bounds.maxLat &&
        lng >= bounds.minLng && lng <= bounds.maxLng) {
      return region;
    }
  }
  return null;
}

/**
 * Load the rail network data for a specific region
 */
export async function loadRailNetwork(region: Region = 'tokyo'): Promise<RailNetwork> {
  if (networkCache[region]) return networkCache[region]!;

  try {
    const response = await fetch(REGION_FILES[region]);
    if (!response.ok) {
      throw new Error(`Failed to load rail network data for ${region}`);
    }
    const networkData = await response.json();
    networkCache[region] = networkData;

    // Build name index for quick station lookup
    const stationIndex = new Map<string, RailStation[]>();
    for (const station of Object.values(networkData.stations) as RailStation[]) {
      const existing = stationIndex.get(station.name) || [];
      existing.push(station);
      stationIndex.set(station.name, existing);
    }
    stationIndexCache[region] = stationIndex;

    console.log(`Loaded ${region} rail network: ${networkData.metadata.total_stations} stations, ${networkData.metadata.total_lines} lines`);
    return networkData;
  } catch (err) {
    console.error(`Error loading ${region} rail network:`, err);
    throw err;
  }
}

/**
 * Load rail network for a coordinate (auto-detect region)
 */
export async function loadRailNetworkForCoordinate(lat: number, lng: number): Promise<RailNetwork | null> {
  const region = detectRegion(lat, lng);
  if (!region) {
    console.log(`No rail network available for coordinates (${lat}, ${lng})`);
    return null;
  }
  return loadRailNetwork(region);
}

/**
 * Calculate haversine distance between two coordinates in meters
 */
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a = Math.sin(deltaPhi / 2) ** 2 +
            Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Find nearest stations to a coordinate
 */
export function findNearestStations(
  lat: number,
  lng: number,
  networkData: RailNetwork,
  maxDistance: number = 1000, // meters
  limit: number = 5
): Array<{ station: RailStation; distance: number }> {
  const results: Array<{ station: RailStation; distance: number }> = [];

  for (const station of Object.values(networkData.stations)) {
    const distance = haversineDistance(lat, lng, station.lat, station.lng);
    if (distance <= maxDistance) {
      results.push({ station, distance });
    }
  }

  return results
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

/**
 * Priority queue for Dijkstra's algorithm
 */
class PriorityQueue<T> {
  private items: Array<{ value: T; priority: number }> = [];

  enqueue(value: T, priority: number): void {
    const item = { value, priority };
    let added = false;
    for (let i = 0; i < this.items.length; i++) {
      if (priority < this.items[i].priority) {
        this.items.splice(i, 0, item);
        added = true;
        break;
      }
    }
    if (!added) {
      this.items.push(item);
    }
  }

  dequeue(): T | undefined {
    return this.items.shift()?.value;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

/**
 * Find shortest path between two stations using Dijkstra's algorithm
 * Cost function considers distance and transfer penalties
 */
export function findPath(
  fromStationId: string,
  toStationId: string,
  networkData: RailNetwork
): RailRoute | null {
  const stations = networkData.stations;
  if (!stations[fromStationId] || !stations[toStationId]) {
    return null;
  }

  // Dijkstra's algorithm
  const distances = new Map<string, number>();
  const previous = new Map<string, { stationId: string; connection: RailConnection } | null>();
  const pq = new PriorityQueue<string>();

  // Initialize
  for (const id of Object.keys(stations)) {
    distances.set(id, Infinity);
    previous.set(id, null);
  }
  distances.set(fromStationId, 0);
  pq.enqueue(fromStationId, 0);

  while (!pq.isEmpty()) {
    const currentId = pq.dequeue()!;

    if (currentId === toStationId) break;

    const current = stations[currentId];
    const currentDist = distances.get(currentId)!;

    for (const conn of current.connections) {
      // Calculate cost: distance + transfer penalty
      let cost = conn.distance;
      if (conn.transfer) {
        cost += TRANSFER_TIME * WALK_SPEED_MPS; // Add transfer penalty as equivalent distance
      }

      const newDist = currentDist + cost;
      if (newDist < distances.get(conn.to)!) {
        distances.set(conn.to, newDist);
        previous.set(conn.to, { stationId: currentId, connection: conn });
        pq.enqueue(conn.to, newDist);
      }
    }
  }

  // Reconstruct path
  if (distances.get(toStationId) === Infinity) {
    return null; // No path found
  }

  const path: Array<{ station: RailStation; connection: RailConnection | null }> = [];
  let currentId: string | null = toStationId;

  while (currentId) {
    const prev = previous.get(currentId);
    path.unshift({
      station: stations[currentId],
      connection: prev?.connection || null,
    });
    currentId = prev?.stationId || null;
  }

  // Convert path to route steps
  const steps: RouteStep[] = [];
  let totalDistance = 0;
  let totalDuration = 0;
  let transfers = 0;
  let currentLine: string | null = null;

  for (let i = 1; i < path.length; i++) {
    const from = path[i - 1].station;
    const to = path[i].station;
    const conn = path[i].connection!;

    const isTransfer = conn.transfer || false;
    const line = conn.line;
    const lineInfo = networkData.lines[line];

    if (isTransfer) {
      transfers++;
      steps.push({
        type: 'transfer',
        from,
        to,
        distance: conn.distance,
        duration: TRANSFER_TIME,
      });
      totalDuration += TRANSFER_TIME;
    } else {
      // Check if we need to start a new rail segment or extend existing
      const lastStep = steps[steps.length - 1];
      if (lastStep && lastStep.type === 'rail' && lastStep.line === line) {
        // Extend the existing step - track intermediate stations for polyline building
        if (!lastStep.intermediateStations) {
          lastStep.intermediateStations = [];
        }
        lastStep.intermediateStations.push(from); // Add the previous "to" as intermediate
        lastStep.to = to;
        lastStep.distance += conn.distance;
        lastStep.duration += conn.distance / TRAIN_SPEED_MPS;
      } else {
        // Start a new rail segment
        if (currentLine && currentLine !== line) {
          transfers++; // Line change without explicit transfer
        }
        steps.push({
          type: 'rail',
          from,
          to,
          line,
          lineColor: lineInfo?.color || '#666666',
          distance: conn.distance,
          duration: conn.distance / TRAIN_SPEED_MPS,
          intermediateStations: [],
        });
      }
      currentLine = line;
    }
    totalDistance += conn.distance;
  }

  // Recalculate total duration from steps
  totalDuration = steps.reduce((sum, step) => sum + step.duration, 0);

  return {
    steps,
    totalDistance,
    totalDuration,
    transfers,
  };
}

/**
 * Find route between two coordinates
 * Finds nearest stations and routes between them
 */
export async function findRouteByCoordinates(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<RailRoute | null> {
  // Detect region from origin coordinates
  const region = detectRegion(fromLat, fromLng);
  if (!region) {
    console.log('Origin coordinates not in supported region');
    return null;
  }

  // Verify destination is in same region
  const destRegion = detectRegion(toLat, toLng);
  if (destRegion !== region) {
    console.log('Destination is in different region, cross-region routing not supported');
    return null;
  }

  const networkData = await loadRailNetwork(region);

  // Find nearest stations
  const fromStations = findNearestStations(fromLat, fromLng, networkData, 2000, 3);
  const toStations = findNearestStations(toLat, toLng, networkData, 2000, 3);

  if (fromStations.length === 0 || toStations.length === 0) {
    console.log('No nearby stations found');
    return null;
  }

  // Try to find best route considering walking distances
  let bestRoute: RailRoute | null = null;
  let bestTotalCost = Infinity;

  for (const from of fromStations) {
    for (const to of toStations) {
      const route = findPath(from.station.id, to.station.id, networkData);
      if (route) {
        // Add walking distances to total cost
        const walkingDistance = from.distance + to.distance;
        const walkingDuration = walkingDistance / WALK_SPEED_MPS;
        const totalCost = route.totalDuration + walkingDuration;

        if (totalCost < bestTotalCost) {
          bestTotalCost = totalCost;

          // Add walking steps to route
          const steps = [...route.steps];

          // Add initial walk if needed
          if (from.distance > 50) { // More than 50m
            steps.unshift({
              type: 'walk',
              from: {
                id: 'origin',
                name: 'Origin',
                line: '',
                operator: '',
                lat: fromLat,
                lng: fromLng,
                rail_type: '',
                operator_type: '',
                connections: [],
              },
              to: from.station,
              distance: from.distance,
              duration: from.distance / WALK_SPEED_MPS,
            });
          }

          // Add final walk if needed
          if (to.distance > 50) {
            steps.push({
              type: 'walk',
              from: to.station,
              to: {
                id: 'destination',
                name: 'Destination',
                line: '',
                operator: '',
                lat: toLat,
                lng: toLng,
                rail_type: '',
                operator_type: '',
                connections: [],
              },
              distance: to.distance,
              duration: to.distance / WALK_SPEED_MPS,
            });
          }

          bestRoute = {
            steps,
            totalDistance: route.totalDistance + walkingDistance,
            totalDuration: route.totalDuration + walkingDuration,
            transfers: route.transfers,
          };
        }
      }
    }
  }

  return bestRoute;
}

/**
 * Encode a path as a polyline string for Google Maps
 */
export function encodePolyline(points: Array<{ lat: number; lng: number }>): string {
  let encoded = '';
  let prevLat = 0;
  let prevLng = 0;

  for (const point of points) {
    const lat = Math.round(point.lat * 1e5);
    const lng = Math.round(point.lng * 1e5);

    encoded += encodeNumber(lat - prevLat);
    encoded += encodeNumber(lng - prevLng);

    prevLat = lat;
    prevLng = lng;
  }

  return encoded;
}

function encodeNumber(num: number): string {
  let sgn_num = num << 1;
  if (num < 0) {
    sgn_num = ~sgn_num;
  }

  let encoded = '';
  while (sgn_num >= 0x20) {
    encoded += String.fromCharCode((0x20 | (sgn_num & 0x1f)) + 63);
    sgn_num >>= 5;
  }
  encoded += String.fromCharCode(sgn_num + 63);

  return encoded;
}

/**
 * Get line color for a given line name from network data
 */
export function getLineColor(lineName: string, networkData: RailNetwork): string {
  return networkData.lines[lineName]?.color || '#666666';
}

/**
 * Search stations by name (partial match) in a network
 */
export function searchStations(query: string, networkData: RailNetwork, limit: number = 10): RailStation[] {
  if (!query) return [];

  const results: RailStation[] = [];
  const queryLower = query.toLowerCase();

  for (const station of Object.values(networkData.stations)) {
    if (station.name.toLowerCase().includes(queryLower)) {
      results.push(station);
      if (results.length >= limit) break;
    }
  }

  return results;
}

/**
 * Get English name for a station (with fallback to romaji conversion)
 */
async function translateStationName(japaneseName: string): Promise<string> {
  // First check manual translations
  if (STATION_TRANSLATIONS[japaneseName]) {
    return STATION_TRANSLATIONS[japaneseName];
  }
  // Fall back to automatic kanji -> romaji conversion
  return toRomajiAsync(japaneseName);
}

/**
 * Get English name for a line (from JSON data with fallback to romaji conversion)
 */
async function translateLineName(japaneseName: string): Promise<string> {
  // First check JSON data (sourced from Wikipedia)
  const lineData = await loadLineData();
  if (lineData[japaneseName]?.en) {
    return lineData[japaneseName].en;
  }
  // Fall back to automatic kanji -> romaji conversion
  return toRomajiAsync(japaneseName);
}

/**
 * Pre-initialize kuroshiro and line data (call this early to avoid delays later)
 */
export async function preloadRomajiConverter(): Promise<void> {
  await Promise.all([initKuroshiro(), loadLineData()]);
}

/**
 * Get proper line color (from JSON data sourced from Wikipedia)
 */
async function getProperLineColor(lineName: string, fallbackColor?: string): Promise<string> {
  const lineData = await loadLineData();
  return lineData[lineName]?.color || fallbackColor || '#666666';
}

/**
 * Build a polyline for a rail step using station coordinates
 * This creates a path through all stations on the route
 */
function buildStepPolyline(step: RouteStep): string {
  const points: Array<{ lat: number; lng: number }> = [];

  // Start with the origin station
  points.push({ lat: step.from.lat, lng: step.from.lng });

  // Add all intermediate stations (these are the actual stops along the line)
  if (step.intermediateStations && step.intermediateStations.length > 0) {
    for (const station of step.intermediateStations) {
      points.push({ lat: station.lat, lng: station.lng });
    }
  }

  // End with the destination station
  points.push({ lat: step.to.lat, lng: step.to.lng });

  return encodePolyline(points);
}

// Extended transit step with intermediate stations for map display
export interface ExtendedTransitStep {
  type: 'WALK' | 'TRANSIT' | 'TRANSFER';
  polyline: string;
  distanceMeters: number;
  durationSeconds: number;
  lineName?: string;
  lineNameJa?: string; // Original Japanese name
  lineShortName?: string;
  lineColor?: string;
  vehicleType?: string;
  departureStop?: string;
  departureStopJa?: string;
  arrivalStop?: string;
  arrivalStopJa?: string;
  stopCount?: number;
  // Intermediate stations for drawing on map
  intermediateStations?: Array<{
    name: string;
    nameJa: string;
    lat: number;
    lng: number;
  }>;
}

/**
 * Convert a RailRoute to TransitSteps compatible with the map display
 */
export async function railRouteToTransitSteps(route: RailRoute): Promise<ExtendedTransitStep[]> {
  const steps: ExtendedTransitStep[] = [];

  for (const step of route.steps) {
    // Build polyline through all stations on the route
    const polyline = buildStepPolyline(step);

    if (step.type === 'walk') {
      steps.push({
        type: 'WALK' as const,
        polyline,
        distanceMeters: step.distance,
        durationSeconds: step.duration,
      });
    } else if (step.type === 'transfer') {
      // Transfer between lines at the same station - show as a special transfer step
      const stationName = await translateStationName(step.from.name);
      steps.push({
        type: 'TRANSFER' as const,
        polyline,
        distanceMeters: step.distance,
        durationSeconds: step.duration,
        departureStop: stationName,
        departureStopJa: step.from.name,
        arrivalStop: stationName,
        arrivalStopJa: step.to.name,
      });
    } else {
      // Regular rail step
      const departureStop = await translateStationName(step.from.name);
      const arrivalStop = await translateStationName(step.to.name);
      const lineName = await translateLineName(step.line || '');
      const lineColor = await getProperLineColor(step.line || '', step.lineColor);

      // Count intermediate stations for stop count
      const stopCount = step.intermediateStations ? step.intermediateStations.length + 1 : 1;

      // Build intermediate stations array for map markers
      const intermediateStations = step.intermediateStations
        ? await Promise.all(
            step.intermediateStations.map(async station => ({
              name: await translateStationName(station.name),
              nameJa: station.name,
              lat: station.lat,
              lng: station.lng,
            }))
          )
        : undefined;

      steps.push({
        type: 'TRANSIT' as const,
        polyline,
        distanceMeters: step.distance,
        durationSeconds: step.duration,
        lineName,
        lineNameJa: step.line,
        lineShortName: lineName,
        lineColor,
        vehicleType: 'RAIL',
        departureStop,
        departureStopJa: step.from.name,
        arrivalStop,
        arrivalStopJa: step.to.name,
        stopCount,
        intermediateStations,
      });
    }
  }

  return steps;
}
