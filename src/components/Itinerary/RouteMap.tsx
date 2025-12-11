import { useEffect, useRef, useState, useCallback } from 'react';
import { Stop, RouteSegment } from '../../lib/types';
import { loadGoogleMaps, getMultiStopRoute, TransitStep } from '../../lib/googleMaps';
import { ExtendedTransitStep } from '../../lib/railNetwork';
import { Loader2, Train, Bus, Footprints, Car, TramFront, ArrowLeftRight } from 'lucide-react';

// Extended step type that can be either Google or MLIT
type RouteStepDisplay = TransitStep & Partial<ExtendedTransitStep>;

interface RouteMapProps {
  stops: Stop[];
  routeSegments?: RouteSegment[];
  itineraryColor?: string;
  height?: string;
  showRoute?: boolean; // Whether to fetch and display route between stops
  travelMode?: TravelMode;
  showDirections?: boolean; // Whether to show step-by-step directions below the map
  onRouteStepsChange?: (steps: RouteStepDisplay[]) => void; // Callback when route steps are fetched
}

// Export the type for use in parent components
export type { RouteStepDisplay };

const CATEGORY_COLORS: Record<string, string> = {
  food: '#EF4444',
  temple: '#DC2626',
  shrine: '#B91C1C',
  shopping: '#F59E0B',
  activity: '#3B82F6',
  transport: '#6B7280',
  hotel: '#8B5CF6',
  scenic: '#10B981',
  museum: '#D97706',
  entertainment: '#EC4899',
  other: '#6B7280',
};

export function RouteMap({
  stops,
  routeSegments = [],
  itineraryColor = '#3B82F6',
  height = '400px',
  showRoute = true,
  travelMode = 'transit',
  showDirections = true,
  onRouteStepsChange
}: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeSteps, setRouteSteps] = useState<RouteStepDisplay[]>([]);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const stationMarkersRef = useRef<google.maps.Marker[]>([]); // For intermediate station markers
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const routeFetchedRef = useRef(false);
  const lastStopsKeyRef = useRef<string>('');
  const lastMarkersKeyRef = useRef<string>('');

  // Initialize map
  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current) return;

      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        setError('Google Maps API key not configured');
        return;
      }

      try {
        await loadGoogleMaps();

        // Check if Maps API is actually available
        if (!window.google?.maps?.Map) {
          setError('Maps JavaScript API not enabled. Enable it in Google Cloud Console.');
          return;
        }

        const newMap = new google.maps.Map(mapRef.current, {
          zoom: 14,
          center: { lat: 35.6762, lng: 139.6503 }, // Tokyo default
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          scrollwheel: true,
          gestureHandling: 'auto', // Enable all gestures (pan, zoom, etc.)
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }],
            },
          ],
        });

        setMap(newMap);
      } catch (err) {
        console.error('RouteMap init error:', err);
        setError('Failed to load Google Maps. Check console for details.');
      }
    };

    initMap();
  }, []);

  // Update markers when stops change
  useEffect(() => {
    if (!map) return;

    // Create a key to check if stops have actually changed
    const markersKey = stops.map(s => `${s.id}-${s.lat}-${s.lng}`).join(',');
    if (markersKey === lastMarkersKeyRef.current) {
      return; // Stops haven't changed, skip re-rendering markers
    }
    lastMarkersKeyRef.current = markersKey;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    let hasValidCoords = false;

    stops.forEach((stop, index) => {
      if (stop.lat && stop.lng) {
        hasValidCoords = true;
        const position = { lat: stop.lat, lng: stop.lng };
        bounds.extend(position);

        const marker = new google.maps.Marker({
          position,
          map,
          title: stop.name,
          label: {
            text: String(index + 1),
            color: '#FFFFFF',
            fontWeight: 'bold',
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 16,
            fillColor: CATEGORY_COLORS[stop.category] || itineraryColor,
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
          },
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px;">
              <strong>${stop.name}</strong>
              ${stop.address ? `<br><small>${stop.address}</small>` : ''}
              ${stop.estimated_duration_minutes ? `<br><small>${stop.estimated_duration_minutes} min</small>` : ''}
            </div>
          `,
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        markersRef.current.push(marker);
      }
    });

    if (hasValidCoords) {
      map.fitBounds(bounds);
      if (stops.length === 1) {
        map.setZoom(15);
      }
    }
  }, [map, stops, itineraryColor]);

  // Draw simple straight lines between stops as fallback
  const drawSimpleRoute = useCallback(() => {
    if (!map) return;

    // Clear existing polylines
    polylinesRef.current.forEach(polyline => polyline.setMap(null));
    polylinesRef.current = [];

    const validStops = stops.filter(s => s.lat && s.lng);

    for (let i = 0; i < validStops.length - 1; i++) {
      const path = [
        { lat: validStops[i].lat!, lng: validStops[i].lng! },
        { lat: validStops[i + 1].lat!, lng: validStops[i + 1].lng! },
      ];

      const polyline = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: itineraryColor,
        strokeOpacity: 0.6,
        strokeWeight: 3,
        icons: [{
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 3,
            strokeColor: itineraryColor,
          },
          offset: '50%',
        }],
      });

      polyline.setMap(map);
      polylinesRef.current.push(polyline);
    }
  }, [map, stops, itineraryColor]);

  // Fetch route using Routes API (supports transit properly)
  // For multiple stops, we make separate API calls for each leg and string them together
  const fetchRoute = useCallback(async () => {
    if (!map || stops.length < 2 || !showRoute) return;

    // Filter stops with valid coordinates
    const validStops = stops.filter(s => s.lat && s.lng);
    if (validStops.length < 2) return;

    setIsLoadingRoute(true);

    try {
      // Clear previous renderer
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }

      // Clear existing polylines
      polylinesRef.current.forEach(p => p.setMap(null));
      polylinesRef.current = [];

      console.log('Fetching routes for', validStops.length, 'stops using Routes API');

      // Use the new Routes API which supports transit properly
      // getMultiStopRoute makes individual transit requests for each leg
      const stopCoords = validStops.map(s => ({ lat: s.lat!, lng: s.lng! }));
      const result = await getMultiStopRoute(stopCoords);

      if (result.steps.length > 0) {
        // Save steps for display
        const steps = result.steps as RouteStepDisplay[];
        setRouteSteps(steps);
        onRouteStepsChange?.(steps);

        // Clear existing station markers
        stationMarkersRef.current.forEach(m => m.setMap(null));
        stationMarkersRef.current = [];

        // Draw each step's polyline with appropriate color
        result.steps.forEach((step) => {
          if (!step.polyline) return;

          // Decode the polyline using Google Maps geometry library
          const path = google.maps.geometry.encoding.decodePath(step.polyline);

          // Determine color based on step type and transit line
          let strokeColor = itineraryColor;
          let strokeWeight = 4;
          let strokeOpacity = 0.8;
          let isDashed = false;

          if (step.type === 'WALK') {
            strokeColor = '#6B7280'; // Gray for walking
            strokeWeight = 3;
            isDashed = true;
          } else if (step.type === 'TRANSIT' && step.lineColor) {
            strokeColor = step.lineColor;
            strokeWeight = 6;
          } else if (step.type === 'DRIVE') {
            strokeColor = '#3B82F6'; // Blue for driving
          }

          const polylineOptions: google.maps.PolylineOptions = {
            path,
            geodesic: true,
            strokeColor,
            strokeOpacity,
            strokeWeight,
          };

          // Add dashed pattern for walking
          if (isDashed) {
            polylineOptions.strokeOpacity = 0;
            polylineOptions.icons = [{
              icon: {
                path: 'M 0,-1 0,1',
                strokeOpacity: 0.8,
                strokeWeight: 3,
                scale: 3,
              },
              offset: '0',
              repeat: '15px',
            }];
          }

          const polyline = new google.maps.Polyline(polylineOptions);
          polyline.setMap(map);
          polylinesRef.current.push(polyline);

        });

        console.log(`Routes found: ${result.steps.length} steps, total ${Math.round(result.totalDuration / 60)} min`);
      } else {
        setRouteSteps([]);
        // No routes found, draw simple lines
        console.log('No routes found from Routes API, using simple lines');
        drawSimpleRoute();
      }
    } catch (err) {
      console.error('Error fetching route:', err);
      // Fall back to simple polylines
      drawSimpleRoute();
    } finally {
      setIsLoadingRoute(false);
    }
  }, [map, stops, showRoute, itineraryColor, drawSimpleRoute]);

  // Draw route polylines from provided segments OR fetch new ones
  useEffect(() => {
    if (!map) return;

    // Create a key based on stop IDs to detect changes
    const stopsKey = stops.map(s => s.id).join(',');

    // Skip if we already fetched for these stops
    if (stopsKey === lastStopsKeyRef.current && routeFetchedRef.current) {
      return;
    }

    // Clear previous directions renderer
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current = null;
    }

    // Clear existing polylines
    polylinesRef.current.forEach(polyline => polyline.setMap(null));
    polylinesRef.current = [];

    // If we have pre-fetched route segments, use them
    if (routeSegments.length > 0) {
      routeSegments.forEach((segment) => {
        if (segment.route_polyline) {
          const path = google.maps.geometry.encoding.decodePath(segment.route_polyline);

          const polyline = new google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: segment.travel_mode === 'transit' ? '#10B981' : itineraryColor,
            strokeOpacity: 0.8,
            strokeWeight: segment.travel_mode === 'transit' ? 4 : 3,
          });

          polyline.setMap(map);
          polylinesRef.current.push(polyline);
        }
      });
      lastStopsKeyRef.current = stopsKey;
      routeFetchedRef.current = true;
    } else if (showRoute && stops.length >= 2) {
      // Fetch route from Directions API
      lastStopsKeyRef.current = stopsKey;
      routeFetchedRef.current = true;
      fetchRoute();
    }
  }, [map, routeSegments, itineraryColor, showRoute, stops, fetchRoute]);

  if (error) {
    return (
      <div
        className="bg-gray-100 rounded-lg flex items-center justify-center text-gray-500"
        style={{ height }}
      >
        <div className="text-center p-4">
          <p>{error}</p>
          <p className="text-sm mt-2">Add VITE_GOOGLE_MAPS_API_KEY to .env</p>
        </div>
      </div>
    );
  }

  if (stops.length === 0) {
    return (
      <div
        className="bg-gray-100 rounded-lg flex items-center justify-center text-gray-500"
        style={{ height }}
      >
        <p>Add stops to see the route map</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={mapRef}
        className="rounded-lg overflow-hidden"
        style={{ height, width: '100%' }}
      />
      {isLoadingRoute && (
        <div className="absolute top-2 right-2 bg-white/90 rounded-md px-2 py-1 flex items-center gap-1 text-xs text-muted-foreground shadow">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading route...
        </div>
      )}

      {/* Step-by-step directions */}
      {showDirections && routeSteps.length > 0 && (
        <div className="mt-3 space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Directions</h4>
          <div className="space-y-1">
            {routeSteps.map((step, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-2 rounded-md bg-muted/50 text-sm text-left"
              >
                {/* Icon */}
                <div
                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5"
                  style={{
                    backgroundColor: step.type === 'TRANSIT' && step.lineColor ? step.lineColor : step.type === 'WALK' ? '#6B7280' : step.type === 'TRANSFER' ? '#9CA3AF' : '#3B82F6',
                    color: step.type === 'TRANSIT' && step.lineTextColor ? step.lineTextColor : '#FFFFFF',
                  }}
                >
                  {step.type === 'WALK' && <Footprints className="h-3 w-3" />}
                  {step.type === 'DRIVE' && <Car className="h-3 w-3" />}
                  {step.type === 'TRANSFER' && <ArrowLeftRight className="h-3 w-3" />}
                  {step.type === 'TRANSIT' && step.vehicleType === 'BUS' && <Bus className="h-3 w-3" />}
                  {step.type === 'TRANSIT' && step.vehicleType === 'SUBWAY' && <TramFront className="h-3 w-3" />}
                  {step.type === 'TRANSIT' && step.vehicleType === 'RAIL' && <Train className="h-3 w-3" />}
                  {step.type === 'TRANSIT' && !['BUS', 'SUBWAY', 'RAIL'].includes(step.vehicleType || '') && <Train className="h-3 w-3" />}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 text-left">
                  {step.type === 'WALK' && (
                    <p className="text-muted-foreground text-left">
                      Walk {Math.round(step.distanceMeters / 10) * 10}m ({Math.ceil(step.durationSeconds / 60)} min)
                    </p>
                  )}
                  {step.type === 'DRIVE' && (
                    <p className="text-muted-foreground text-left">
                      Drive {(step.distanceMeters / 1000).toFixed(1)}km ({Math.ceil(step.durationSeconds / 60)} min)
                    </p>
                  )}
                  {step.type === 'TRANSFER' && (
                    <p className="text-muted-foreground text-left">
                      Transfer at <span className="text-foreground font-medium">{step.departureStop}</span>
                      {step.departureStopJa && step.departureStopJa !== step.departureStop && (
                        <span className="ml-1">({step.departureStopJa})</span>
                      )}
                    </p>
                  )}
                  {step.type === 'TRANSIT' && (
                    <div className="text-left">
                      <div className="flex items-center gap-2 flex-wrap justify-start">
                        <span
                          className="px-1.5 py-0.5 rounded text-xs font-medium"
                          style={{
                            backgroundColor: step.lineColor || '#6B7280',
                            color: step.lineTextColor || '#FFFFFF',
                          }}
                        >
                          {step.lineName || step.lineShortName}
                        </span>
                        {/* Show Japanese line name if different */}
                        {step.lineNameJa && step.lineNameJa !== step.lineName && (
                          <span className="text-muted-foreground text-xs opacity-70">
                            {step.lineNameJa}
                          </span>
                        )}
                        {/* Direction indicator - Japanese style "bound for [destination]" */}
                        {step.arrivalStop && (
                          <span className="text-muted-foreground text-xs">
                            → {step.arrivalStop}方面
                            {step.arrivalStopJa && step.arrivalStopJa !== step.arrivalStop && (
                              <span className="opacity-70 ml-0.5">({step.arrivalStopJa}方面)</span>
                            )}
                          </span>
                        )}
                      </div>
                      <div className="text-xs mt-0.5 text-left">
                        <span className="text-foreground font-medium">{step.departureStop}</span>
                        {step.departureStopJa && step.departureStopJa !== step.departureStop && (
                          <span className="text-muted-foreground ml-1">({step.departureStopJa})</span>
                        )}
                        <span className="text-muted-foreground mx-1">→</span>
                        <span className="text-foreground font-medium">{step.arrivalStop}</span>
                        {step.arrivalStopJa && step.arrivalStopJa !== step.arrivalStop && (
                          <span className="text-muted-foreground ml-1">({step.arrivalStopJa})</span>
                        )}
                        {step.stopCount && step.stopCount > 1 && (
                          <span className="text-muted-foreground ml-1">({step.stopCount} stops)</span>
                        )}
                      </div>
                      {step.departureTime && step.arrivalTime && (
                        <p className="text-xs text-muted-foreground text-left">
                          {step.departureTime} - {step.arrivalTime}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Duration badge */}
                <div className="flex-shrink-0 text-xs text-muted-foreground">
                  {Math.ceil(step.durationSeconds / 60)} min
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
