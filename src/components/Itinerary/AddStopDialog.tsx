import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Loader2, Search, MapPin, Clock, Star } from "lucide-react";
import supabase from "../../lib/createClient";
import { useToast } from "../../hooks/use-toast";
import {
  searchPlaces,
  getPlaceDetails,
  PlaceSearchResult,
  isGoogleMapsConfigured,
} from "../../lib/googleMaps";
import { Stop, StopCategory } from "../../lib/types";

interface AddStopDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itineraryId: string;
  currentUserId: string;
  existingStopIds: string[];
  onStopAdded: () => void;
}

const CATEGORY_OPTIONS: { value: StopCategory; label: string; emoji: string }[] = [
  { value: "food", label: "Food & Dining", emoji: "🍜" },
  { value: "temple", label: "Temple", emoji: "⛩️" },
  { value: "shrine", label: "Shrine", emoji: "🏯" },
  { value: "shopping", label: "Shopping", emoji: "🛍️" },
  { value: "activity", label: "Activity", emoji: "🎯" },
  { value: "transport", label: "Transport", emoji: "🚃" },
  { value: "hotel", label: "Hotel", emoji: "🏨" },
  { value: "scenic", label: "Scenic", emoji: "🏔️" },
  { value: "museum", label: "Museum", emoji: "🏛️" },
  { value: "entertainment", label: "Entertainment", emoji: "🎭" },
  { value: "other", label: "Other", emoji: "📍" },
];

export function AddStopDialog({
  open,
  onOpenChange,
  itineraryId,
  currentUserId,
  existingStopIds,
  onStopAdded,
}: AddStopDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceSearchResult | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Manual entry fields (when not using Google)
  const [manualName, setManualName] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [manualCategory, setManualCategory] = useState<StopCategory>("other");
  const [manualDuration, setManualDuration] = useState("60");

  const [mode, setMode] = useState<"search" | "manual">("search");

  const { toast } = useToast();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSearchResults([]);
      setSelectedPlace(null);
      setManualName("");
      setManualAddress("");
      setManualDescription("");
      setManualCategory("other");
      setManualDuration("60");
      setMode(isGoogleMapsConfigured() ? "search" : "manual");
    }
  }, [open]);

  // Debounced search function
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Default to Japan location for better results
      const results = await searchPlaces(query, {
        lat: 35.6762, // Tokyo
        lng: 139.6503,
      });
      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
      // Don't show toast for every failed autocomplete
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Handle search input change with debounce
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setSelectedPlace(null); // Clear selection when typing

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer for debounced search
    debounceTimerRef.current = setTimeout(() => {
      performSearch(value);
    }, 300); // 300ms debounce
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Handle place selection
  const handleSelectPlace = async (place: PlaceSearchResult) => {
    setSelectedPlace(place);

    // Get full details
    try {
      const details = await getPlaceDetails(place.place_id);
      if (details) {
        setSelectedPlace({
          ...place,
          ...details,
        } as PlaceSearchResult);
      }
    } catch (error) {
      console.error("Error getting place details:", error);
    }
  };

  // Add stop to itinerary
  const handleAddStop = async () => {
    setIsSubmitting(true);

    try {
      let stopData: Partial<Stop>;

      if (mode === "search" && selectedPlace) {
        // Get full place details first
        const details = await getPlaceDetails(selectedPlace.place_id);

        stopData = {
          name: selectedPlace.name,
          address: selectedPlace.formatted_address,
          lat: selectedPlace.geometry.lat,
          lng: selectedPlace.geometry.lng,
          google_place_id: selectedPlace.place_id,
          category: details?.category || "other",
          rating: selectedPlace.rating,
          photo_url: details?.photo_url || selectedPlace.photos?.[0],
          opening_hours: details?.opening_hours,
          phone: details?.phone,
          website: details?.website,
          price_level: selectedPlace.price_level,
          estimated_duration_minutes: 60,
          created_by: currentUserId,
        };
      } else {
        // Manual entry
        stopData = {
          name: manualName.trim(),
          address: manualAddress.trim() || undefined,
          description: manualDescription.trim() || undefined,
          category: manualCategory,
          estimated_duration_minutes: parseInt(manualDuration) || 60,
          created_by: currentUserId,
        };
      }

      // Check if stop already exists by google_place_id
      let existingStop = null;
      if (stopData.google_place_id) {
        const { data } = await supabase
          .from("stops")
          .select("id")
          .eq("google_place_id", stopData.google_place_id)
          .single();
        existingStop = data;
      }

      let stopId: string;

      if (existingStop) {
        stopId = existingStop.id;
      } else {
        // Create new stop
        const { data: newStop, error: stopError } = await supabase
          .from("stops")
          .insert(stopData)
          .select()
          .single();

        if (stopError) throw stopError;
        stopId = newStop.id;
      }

      // Check if already in this itinerary
      if (existingStopIds.includes(stopId)) {
        toast({
          title: "Already added",
          description: "This stop is already in the itinerary",
        });
        setIsSubmitting(false);
        return;
      }

      // Get next order by counting existing stops
      const { count } = await supabase
        .from("itinerary_stops")
        .select("*", { count: "exact", head: true })
        .eq("itinerary_id", itineraryId);

      const nextOrder = (count || 0);

      // Add to itinerary
      const { error: linkError } = await supabase
        .from("itinerary_stops")
        .insert({
          itinerary_id: itineraryId,
          stop_id: stopId,
          stop_order: nextOrder,
        });

      if (linkError) throw linkError;

      toast({
        title: "Stop added",
        description: `${stopData.name} has been added to the itinerary`,
      });

      onOpenChange(false);
      onStopAdded();
    } catch (error) {
      console.error("Error adding stop:", error);
      toast({
        title: "Error",
        description: "Failed to add stop. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit =
    mode === "search" ? !!selectedPlace : manualName.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Stop</DialogTitle>
          <DialogDescription>
            Search for a place or add details manually.
          </DialogDescription>
        </DialogHeader>

        {/* Mode toggle */}
        {isGoogleMapsConfigured() && (
          <div className="flex gap-2 mb-4">
            <Button
              variant={mode === "search" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("search")}
            >
              <Search className="mr-1 h-4 w-4" />
              Search
            </Button>
            <Button
              variant={mode === "manual" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("manual")}
            >
              <MapPin className="mr-1 h-4 w-4" />
              Manual Entry
            </Button>
          </div>
        )}

        {mode === "search" && isGoogleMapsConfigured() ? (
          <div className="space-y-4">
            {/* Search input with autocomplete */}
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search for a place in Japan..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 pr-10"
                  autoFocus
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Autocomplete dropdown */}
              {searchResults.length > 0 && !selectedPlace && searchQuery.length >= 2 && (
                <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-[250px] overflow-y-auto">
                  {searchResults.map((place) => (
                    <div
                      key={place.place_id}
                      onClick={() => handleSelectPlace(place)}
                      className="p-3 cursor-pointer hover:bg-muted transition-colors border-b last:border-b-0"
                    >
                      <p className="font-medium text-sm">{place.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {place.formatted_address}
                      </p>
                      {place.rating && (
                        <p className="text-xs flex items-center gap-1 mt-0.5">
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                          {place.rating}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* No results message */}
              {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && !selectedPlace && (
                <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg p-3 text-center text-sm text-muted-foreground">
                  No places found. Try a different search or use manual entry.
                </div>
              )}
            </div>

            {/* Selected place preview */}
            {selectedPlace && (
              <div className="p-4 border rounded-lg bg-muted/50">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{selectedPlace.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedPlace.formatted_address}
                    </p>
                    {selectedPlace.rating && (
                      <p className="text-sm flex items-center gap-1 mt-1">
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        {selectedPlace.rating}
                        {selectedPlace.price_level !== undefined && (
                          <span className="ml-2">
                            {"$".repeat(selectedPlace.price_level + 1)}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPlace(null)}
                  >
                    Change
                  </Button>
                </div>
                {selectedPlace.photos?.[0] && (
                  <img
                    src={selectedPlace.photos[0]}
                    alt={selectedPlace.name}
                    className="w-full h-32 object-cover rounded mt-3"
                  />
                )}
              </div>
            )}
          </div>
        ) : (
          /* Manual entry form */
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="e.g., Senso-ji Temple"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                placeholder="e.g., 2 Chome-3-1 Asakusa, Taito City"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
                placeholder="e.g., Ancient Buddhist temple, famous for its giant red lantern"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={manualCategory}
                  onValueChange={(v: StopCategory) => setManualCategory(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <span className="flex items-center gap-2">
                          {cat.emoji} {cat.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (min)</Label>
                <div className="relative">
                  <Input
                    id="duration"
                    type="number"
                    value={manualDuration}
                    onChange={(e) => setManualDuration(e.target.value)}
                    min="15"
                    step="15"
                  />
                  <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleAddStop} disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Add Stop"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
