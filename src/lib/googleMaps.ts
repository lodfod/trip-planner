import { Stop, RouteSegment, TravelMode } from "./types";
import supabase from "./createClient";
import { findRouteByCoordinates, railRouteToTransitSteps, detectRegion } from "./railNetwork";

// Google Maps API configuration
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Cache duration for route segments (24 hours)
const ROUTE_CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

// ============================================
// GOOGLE MAPS LOADER
// ============================================

let mapsLoaded = false;
let mapsLoadPromise: Promise<void> | null = null;

/**
 * Load Google Maps JavaScript API
 */
export async function loadGoogleMaps(): Promise<void> {
  if (mapsLoaded) return;

  if (mapsLoadPromise) return mapsLoadPromise;

  mapsLoadPromise = new Promise((resolve, reject) => {
    if (!GOOGLE_MAPS_API_KEY) {
      reject(new Error("Google Maps API key not configured"));
      return;
    }

    // Check if already loaded
    if (window.google?.maps?.Map) {
      mapsLoaded = true;
      resolve();
      return;
    }

    // Create a callback function for when the API is ready
    const callbackName = '__googleMapsCallback';
    (window as unknown as Record<string, () => void>)[callbackName] = () => {
      mapsLoaded = true;
      delete (window as unknown as Record<string, () => void>)[callbackName];
      resolve();
    };

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry&callback=${callbackName}`;
    script.async = true;
    script.defer = true;

    script.onerror = () => {
      delete (window as unknown as Record<string, () => void>)[callbackName];
      reject(new Error("Failed to load Google Maps"));
    };

    document.head.appendChild(script);
  });

  return mapsLoadPromise;
}

/**
 * Check if Google Maps is available
 */
export function isGoogleMapsLoaded(): boolean {
  return mapsLoaded && !!window.google?.maps;
}

// ============================================
// PLACES API (New - google.maps.places.Place)
// ============================================

export interface PlaceSearchResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    lat: number;
    lng: number;
  };
  types: string[];
  rating?: number;
  price_level?: number;
  opening_hours?: {
    open_now: boolean;
  };
  photos?: string[];
}

/**
 * Search for places using the new Google Places API (google.maps.places.Place)
 */
export async function searchPlaces(
  query: string,
  _location?: { lat: number; lng: number }, // Not used currently, region param biases to Japan
  _radius: number = 50000 // Not used currently
): Promise<PlaceSearchResult[]> {
  await loadGoogleMaps();

  try {
    // Build the request - skip locationBias as it requires additional setup
    // The region parameter already biases results towards Japan
    const request: google.maps.places.SearchByTextRequest = {
      textQuery: query,
      fields: [
        "id",
        "displayName",
        "formattedAddress",
        "location",
        "types",
        "rating",
        "priceLevel",
        "photos",
        "regularOpeningHours",
      ],
      maxResultCount: 10,
      language: "en",
      region: "jp", // Bias towards Japan
    };

    // Use the new Place.searchByText API
    const { places } = await google.maps.places.Place.searchByText(request);

    if (!places || places.length === 0) {
      return [];
    }

    const results: PlaceSearchResult[] = await Promise.all(
      places.map(async (place) => {
        // Get photo URL if available
        let photoUrl: string | undefined;
        if (place.photos && place.photos.length > 0) {
          try {
            const photoUri = place.photos[0].getURI({ maxWidth: 400, maxHeight: 300 });
            photoUrl = photoUri;
          } catch {
            // Photo not available
          }
        }

        return {
          place_id: place.id || "",
          name: place.displayName || "",
          formatted_address: place.formattedAddress || "",
          geometry: {
            lat: place.location?.lat() || 0,
            lng: place.location?.lng() || 0,
          },
          types: place.types || [],
          rating: place.rating,
          price_level: place.priceLevel ? parsePriceLevel(place.priceLevel) : undefined,
          opening_hours: place.regularOpeningHours
            ? { open_now: false } // isOpen() requires beta channel, skip for now
            : undefined,
          photos: photoUrl ? [photoUrl] : undefined,
        };
      })
    );

    return results;
  } catch (error) {
    console.error("Places search failed:", error);
    throw error;
  }
}

/**
 * Parse the new PriceLevel enum to a number
 */
function parsePriceLevel(priceLevel: string): number | undefined {
  const levels: Record<string, number> = {
    FREE: 0,
    INEXPENSIVE: 1,
    MODERATE: 2,
    EXPENSIVE: 3,
    VERY_EXPENSIVE: 4,
  };
  return levels[priceLevel];
}

/**
 * Get detailed place information using the new Places API
 */
export async function getPlaceDetails(
  placeId: string
): Promise<Partial<Stop> | null> {
  await loadGoogleMaps();

  try {
    const place = new google.maps.places.Place({ id: placeId });

    await place.fetchFields({
      fields: [
        "id",
        "displayName",
        "formattedAddress",
        "location",
        "types",
        "rating",
        "priceLevel",
        "photos",
        "regularOpeningHours",
        "internationalPhoneNumber",
        "websiteURI",
      ],
    });

    // Map Google place types to our categories
    const category = mapPlaceTypeToCategory(place.types || []);

    // Get photo URL
    let photoUrl: string | undefined;
    if (place.photos && place.photos.length > 0) {
      try {
        photoUrl = place.photos[0].getURI({ maxWidth: 800, maxHeight: 600 });
      } catch {
        // Photo not available
      }
    }

    // Parse opening hours (skip isOpen() as it requires beta channel)
    let openingHours: Stop["opening_hours"] | undefined;
    if (place.regularOpeningHours) {
      openingHours = {
        open_now: undefined, // isOpen() requires beta channel
        weekday_text: place.regularOpeningHours.weekdayDescriptions,
        periods: place.regularOpeningHours.periods?.map((p) => ({
          open: {
            day: p.open?.day || 0,
            time: formatTimeFromHourMinute(p.open?.hour, p.open?.minute),
          },
          close: p.close
            ? {
                day: p.close.day,
                time: formatTimeFromHourMinute(p.close.hour, p.close.minute),
              }
            : undefined,
        })),
      };
    }

    const stop: Partial<Stop> = {
      name: place.displayName || "",
      address: place.formattedAddress || "",
      lat: place.location?.lat(),
      lng: place.location?.lng(),
      google_place_id: placeId,
      category,
      opening_hours: openingHours,
      photo_url: photoUrl,
      phone: place.internationalPhoneNumber,
      website: place.websiteURI,
      price_level: place.priceLevel ? parsePriceLevel(place.priceLevel) : undefined,
      rating: place.rating,
    };

    return stop;
  } catch (error) {
    console.error("Failed to get place details:", error);
    return null;
  }
}

/**
 * Format hour and minute to time string (HHMM)
 */
function formatTimeFromHourMinute(hour?: number, minute?: number): string {
  if (hour === undefined) return "";
  const h = hour.toString().padStart(2, "0");
  const m = (minute || 0).toString().padStart(2, "0");
  return `${h}${m}`;
}

/**
 * Map Google place types to our stop categories
 */
function mapPlaceTypeToCategory(types: string[]): Stop["category"] {
  const typeMap: Record<string, Stop["category"]> = {
    restaurant: "food",
    food: "food",
    cafe: "food",
    bakery: "food",
    bar: "food",
    meal_takeaway: "food",
    hindu_temple: "temple",
    place_of_worship: "temple",
    church: "temple",
    mosque: "temple",
    synagogue: "temple",
    shrine: "shrine",
    shopping_mall: "shopping",
    store: "shopping",
    clothing_store: "shopping",
    department_store: "shopping",
    convenience_store: "shopping",
    amusement_park: "activity",
    aquarium: "activity",
    bowling_alley: "activity",
    spa: "activity",
    gym: "activity",
    train_station: "transport",
    subway_station: "transport",
    bus_station: "transport",
    airport: "transport",
    taxi_stand: "transport",
    lodging: "hotel",
    tourist_attraction: "scenic",
    natural_feature: "scenic",
    park: "scenic",
    point_of_interest: "scenic",
    museum: "museum",
    art_gallery: "museum",
    movie_theater: "entertainment",
    night_club: "entertainment",
    casino: "entertainment",
  };

  for (const type of types) {
    if (typeMap[type]) {
      return typeMap[type];
    }
  }

  return "other";
}

// ============================================
// ROUTES API (New) - For Transit Routes
// ============================================

interface RoutesApiResponse {
  routes?: {
    polyline?: {
      encodedPolyline: string;
    };
    legs?: {
      duration: string;
      distanceMeters: number;
      polyline?: {
        encodedPolyline: string;
      };
      steps?: {
        polyline?: {
          encodedPolyline: string;
        };
        distanceMeters?: number;
        staticDuration?: string;
        travelMode: string;
        navigationInstruction?: {
          instructions: string;
        };
        transitDetails?: {
          stopDetails: {
            arrivalStop: { name: string };
            departureStop: { name: string };
            arrivalTime?: string;
            departureTime?: string;
          };
          localizedValues?: {
            arrivalTime?: { time: { text: string } };
            departureTime?: { time: { text: string } };
          };
          headsign?: string;
          transitLine: {
            name: string;
            nameShort?: string;
            color?: string;
            textColor?: string;
            vehicle: {
              type: string;
              name?: { text: string };
            };
          };
          stopCount?: number;
        };
      }[];
    }[];
  }[];
}

// Transit step with all details for display
export interface TransitStep {
  type: 'WALK' | 'TRANSIT' | 'DRIVE' | 'TRANSFER';
  polyline: string;
  distanceMeters: number;
  durationSeconds: number;
  instructions?: string;
  // Transit-specific
  lineName?: string;
  lineShortName?: string;
  lineColor?: string;
  lineTextColor?: string;
  vehicleType?: string;
  departureStop?: string;
  departureStopJa?: string;
  arrivalStop?: string;
  arrivalStopJa?: string;
  departureTime?: string;
  arrivalTime?: string;
  headsign?: string;
  stopCount?: number;
  // Leg info (which segment between stops this step belongs to)
  legIndex?: number;
}

export interface RouteResult {
  polylines: string[];
  steps: TransitStep[];
  totalDuration: number;
  totalDistance: number;
}

/**
 * Get transit route using the new Routes API with detailed steps
 * This supports transit better than the legacy Directions API
 */
export async function getTransitRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<{ steps: TransitStep[]; durationSeconds: number; distanceMeters: number } | null> {
  const apiKey = GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  try {
    // Build request with all required params for transit
    const requestBody = {
      origin: {
        location: {
          latLng: {
            latitude: origin.lat,
            longitude: origin.lng,
          },
        },
      },
      destination: {
        location: {
          latLng: {
            latitude: destination.lat,
            longitude: destination.lng,
          },
        },
      },
      travelMode: 'TRANSIT',
      computeAlternativeRoutes: false,
      languageCode: 'en',
      regionCode: 'JP',
      // Transit preferences - allow all modes
      transitPreferences: {
        allowedTravelModes: ['BUS', 'SUBWAY', 'TRAIN', 'LIGHT_RAIL', 'RAIL'],
      },
      // Departure time - required for transit
      departureTime: new Date().toISOString(),
    };

    console.log('Transit request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.legs.duration,routes.legs.distanceMeters,routes.legs.steps.polyline,routes.legs.steps.travelMode,routes.legs.steps.navigationInstruction,routes.legs.steps.distanceMeters,routes.legs.steps.staticDuration,routes.legs.steps.transitDetails',
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log('Transit API raw response:', response.status, responseText);

    if (!response.ok) {
      console.error('Routes API error:', response.status, responseText);
      try {
        const errorJson = JSON.parse(responseText);
        console.error('Routes API error details:', errorJson.error?.message || errorJson);
      } catch {
        // Not JSON
      }
      return null;
    }

    const data: RoutesApiResponse = JSON.parse(responseText);
    console.log('Transit API parsed response:', data);

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const leg = route.legs?.[0];
      console.log('Route leg:', leg);
      console.log('Steps count:', leg?.steps?.length);

      const steps: TransitStep[] = (leg?.steps || []).map((step) => {
        const baseStep: TransitStep = {
          type: step.travelMode === 'TRANSIT' ? 'TRANSIT' : step.travelMode === 'WALK' ? 'WALK' : 'DRIVE',
          polyline: step.polyline?.encodedPolyline || '',
          distanceMeters: step.distanceMeters || 0,
          durationSeconds: step.staticDuration ? parseInt(step.staticDuration.replace('s', '')) : 0,
          instructions: step.navigationInstruction?.instructions,
        };

        // Add transit details if available
        if (step.transitDetails) {
          const td = step.transitDetails;
          baseStep.lineName = td.transitLine?.name;
          baseStep.lineShortName = td.transitLine?.nameShort;
          baseStep.lineColor = td.transitLine?.color;
          baseStep.lineTextColor = td.transitLine?.textColor;
          baseStep.vehicleType = td.transitLine?.vehicle?.type;
          baseStep.departureStop = td.stopDetails?.departureStop?.name;
          baseStep.arrivalStop = td.stopDetails?.arrivalStop?.name;
          baseStep.departureTime = td.localizedValues?.departureTime?.time?.text;
          baseStep.arrivalTime = td.localizedValues?.arrivalTime?.time?.text;
          baseStep.headsign = td.headsign;
          baseStep.stopCount = td.stopCount;
        }

        return baseStep;
      });

      return {
        steps,
        durationSeconds: leg?.duration ? parseInt(leg.duration.replace('s', '')) : 0,
        distanceMeters: leg?.distanceMeters || 0,
      };
    }

    return null;
  } catch (error) {
    console.error('Error calling Routes API:', error);
    return null;
  }
}

/**
 * Get route for multiple stops using Routes API (transit) with fallback to MLIT rail data and driving
 * Returns detailed steps with transit line info for each leg
 */
export async function getMultiStopRoute(
  stops: { lat: number; lng: number }[]
): Promise<RouteResult> {
  const polylines: string[] = [];
  const allSteps: TransitStep[] = [];
  let totalDuration = 0;
  let totalDistance = 0;

  for (let i = 0; i < stops.length - 1; i++) {
    const origin = stops[i];
    const destination = stops[i + 1];

    // Try Google Routes API transit first
    console.log(`Leg ${i + 1}: Trying Google transit from`, origin, 'to', destination);
    const transitResult = await getTransitRoute(origin, destination);
    console.log(`Leg ${i + 1}: Google transit result:`, transitResult);

    if (transitResult && transitResult.steps.length > 0) {
      // Google returned transit directions - add legIndex to each step
      transitResult.steps.forEach(step => {
        allSteps.push({ ...step, legIndex: i });
        if (step.polyline) {
          polylines.push(step.polyline);
        }
      });
      totalDuration += transitResult.durationSeconds;
      totalDistance += transitResult.distanceMeters;
    } else {
      // Google didn't return transit - try MLIT rail network (for Japan)
      const isInJapan = detectRegion(origin.lat, origin.lng) !== null;

      if (isInJapan) {
        console.log(`Leg ${i + 1}: Trying MLIT rail network`);
        try {
          const railRoute = await findRouteByCoordinates(
            origin.lat, origin.lng,
            destination.lat, destination.lng
          );

          if (railRoute && railRoute.steps.length > 0) {
            console.log(`Leg ${i + 1}: MLIT rail route found:`, railRoute);
            // Convert rail route to transit steps (polyline built from station coordinates)
            const railSteps = await railRouteToTransitSteps(railRoute);

            // Add rail steps directly (they already have all the fields we need) - add legIndex
            railSteps.forEach(step => {
              allSteps.push({ ...step, legIndex: i } as TransitStep);
              if (step.polyline) {
                polylines.push(step.polyline);
              }
            });
            totalDuration += railRoute.totalDuration;
            totalDistance += railRoute.totalDistance;
            continue; // Skip to next leg
          }
        } catch (err) {
          console.error(`Leg ${i + 1}: MLIT rail routing failed:`, err);
        }
      }

      // Fall back to driving
      console.log(`Leg ${i + 1}: Falling back to driving`);
      const drivingResult = await getDrivingRoute(origin, destination);
      if (drivingResult && drivingResult.polyline) {
        polylines.push(drivingResult.polyline);
        allSteps.push({
          type: 'DRIVE',
          polyline: drivingResult.polyline,
          distanceMeters: drivingResult.distanceMeters,
          durationSeconds: drivingResult.durationSeconds,
          instructions: 'Drive to destination',
          legIndex: i,
        });
        totalDuration += drivingResult.durationSeconds;
        totalDistance += drivingResult.distanceMeters;
      }
    }
  }

  return { polylines, steps: allSteps, totalDuration, totalDistance };
}

/**
 * Get driving route using Routes API as fallback
 */
async function getDrivingRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<{ polyline: string; durationSeconds: number; distanceMeters: number } | null> {
  const apiKey = GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.polyline.encodedPolyline,routes.legs.duration,routes.legs.distanceMeters',
      },
      body: JSON.stringify({
        origin: {
          location: {
            latLng: {
              latitude: origin.lat,
              longitude: origin.lng,
            },
          },
        },
        destination: {
          location: {
            latLng: {
              latitude: destination.lat,
              longitude: destination.lng,
            },
          },
        },
        travelMode: 'DRIVE',
        computeAlternativeRoutes: false,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data: RoutesApiResponse = await response.json();

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const leg = route.legs?.[0];

      return {
        polyline: route.polyline?.encodedPolyline || '',
        durationSeconds: leg?.duration ? parseInt(leg.duration.replace('s', '')) : 0,
        distanceMeters: leg?.distanceMeters || 0,
      };
    }

    return null;
  } catch (error) {
    console.error('Error calling Routes API (driving):', error);
    return null;
  }
}

// ============================================
// DIRECTIONS API (Legacy)
// ============================================

/**
 * Get directions between two stops
 */
export async function getDirections(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  mode: TravelMode = "transit"
): Promise<RouteSegment | null> {
  await loadGoogleMaps();

  return new Promise((resolve, reject) => {
    const directionsService = new google.maps.DirectionsService();

    const travelMode =
      mode === "transit"
        ? google.maps.TravelMode.TRANSIT
        : mode === "walking"
        ? google.maps.TravelMode.WALKING
        : google.maps.TravelMode.DRIVING;

    directionsService.route(
      {
        origin: new google.maps.LatLng(origin.lat, origin.lng),
        destination: new google.maps.LatLng(destination.lat, destination.lng),
        travelMode,
        transitOptions:
          mode === "transit"
            ? {
                modes: [
                  google.maps.TransitMode.RAIL,
                  google.maps.TransitMode.SUBWAY,
                  google.maps.TransitMode.BUS,
                ],
              }
            : undefined,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          const route = result.routes[0];
          const leg = route.legs[0];

          const segment: RouteSegment = {
            from_stop_id: "", // Will be set by caller
            to_stop_id: "", // Will be set by caller
            travel_mode: mode,
            duration_seconds: leg.duration?.value,
            distance_meters: leg.distance?.value,
            route_polyline: route.overview_polyline,
            route_summary: leg.steps
              ?.map((s) => s.instructions)
              .filter(Boolean)
              .slice(0, 3)
              .join(" → "),
            route_data: result,
          };

          resolve(segment);
        } else {
          console.error("Directions request failed:", status);
          resolve(null);
        }
      }
    );
  });
}

/**
 * Get or create cached route segment between two stops.
 * For optimization purposes, uses driving mode to get reliable distance/duration
 * estimates. Transit directions are computed separately by the native rail router.
 */
export async function getRouteSegment(
  fromStop: Stop,
  toStop: Stop,
  mode: TravelMode = "transit"
): Promise<RouteSegment | null> {
  if (!fromStop.lat || !fromStop.lng || !toStop.lat || !toStop.lng) {
    return null;
  }

  // For route optimization, use driving mode which always returns results
  // Transit-specific routing is handled by the native rail network router
  const effectiveMode = mode === "transit" ? "driving" : mode;

  // Try to get from cache first (skip if table doesn't exist - 406 error)
  try {
    const { data: cached, error } = await supabase
      .from("route_segments")
      .select("*")
      .eq("from_stop_id", fromStop.id)
      .eq("to_stop_id", toStop.id)
      .eq("travel_mode", effectiveMode)
      .single();

    if (error) {
      console.log("Route segment cache lookup error:", error.code, error.message, error.details, error.hint);
    }

    if (!error && cached) {
      const fetchedAt = new Date(cached.fetched_at).getTime();
      const age = Date.now() - fetchedAt;

      if (age < ROUTE_CACHE_DURATION_MS) {
        return cached as RouteSegment;
      }
    }
  } catch (e) {
    // Cache lookup failed (table may not exist), continue to fetch fresh directions
    console.log("Route segment cache lookup exception:", e);
  }

  // Fetch fresh directions using effective mode (driving for transit optimization)
  const directions = await getDirections(
    { lat: fromStop.lat, lng: fromStop.lng },
    { lat: toStop.lat, lng: toStop.lng },
    effectiveMode
  );

  if (!directions) return null;

  // Update cache (wrapped in try-catch in case table doesn't exist)
  const segment: RouteSegment = {
    ...directions,
    from_stop_id: fromStop.id,
    to_stop_id: toStop.id,
  };

  try {
    await supabase.from("route_segments").upsert(
      {
        from_stop_id: fromStop.id,
        to_stop_id: toStop.id,
        travel_mode: effectiveMode,
        duration_seconds: segment.duration_seconds,
        distance_meters: segment.distance_meters,
        route_polyline: segment.route_polyline,
        route_summary: segment.route_summary,
        route_data: segment.route_data,
        fetched_at: new Date().toISOString(),
      },
      {
        onConflict: "from_stop_id,to_stop_id,travel_mode",
      }
    );
  } catch (e) {
    // Cache update failed (table may not exist), continue anyway
    console.log("Route segment cache update failed");
  }

  return segment;
}

// ============================================
// UTILITIES
// ============================================

/**
 * Format duration in seconds to human-readable string
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} min`;
}

/**
 * Format distance in meters to human-readable string
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${meters} m`;
}

/**
 * Calculate total route duration for a list of segments
 */
export function calculateTotalDuration(segments: RouteSegment[]): number {
  return segments.reduce((total, seg) => total + (seg.duration_seconds || 0), 0);
}

/**
 * Check if Google Maps API key is configured
 */
export function isGoogleMapsConfigured(): boolean {
  return !!GOOGLE_MAPS_API_KEY;
}
