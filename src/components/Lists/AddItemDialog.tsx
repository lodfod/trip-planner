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
import { Loader2, Search, MapPin, Star } from "lucide-react";
import supabase from "../../lib/createClient";
import { useToast } from "../../hooks/use-toast";
import {
  searchPlaces,
  getPlaceDetails,
  PlaceSearchResult,
  isGoogleMapsConfigured,
} from "../../lib/googleMaps";

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string;
  parentItemId: string | null;
  currentUserId: string;
  existingItemCount: number;
  onItemAdded: () => void;
}

export function AddItemDialog({
  open,
  onOpenChange,
  listId,
  parentItemId,
  currentUserId,
  existingItemCount,
  onItemAdded,
}: AddItemDialogProps) {
  const [mode, setMode] = useState<"search" | "text">("text");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceSearchResult | null>(null);

  // Text entry fields
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSearchResults([]);
      setSelectedPlace(null);
      setName("");
      setNotes("");
      setMode(isGoogleMapsConfigured() ? "search" : "text");
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
      const results = await searchPlaces(query, {
        lat: 35.6762, // Tokyo
        lng: 139.6503,
      });
      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Handle search input change with debounce
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setSelectedPlace(null);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
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

  // Add item
  const handleAddItem = async () => {
    setIsSubmitting(true);

    try {
      let itemData: Record<string, unknown>;

      if (mode === "search" && selectedPlace) {
        const details = await getPlaceDetails(selectedPlace.place_id);

        itemData = {
          list_id: listId,
          parent_item_id: parentItemId,
          name: selectedPlace.name,
          notes: notes.trim() || null,
          item_order: existingItemCount,
          is_place: true,
          google_place_id: selectedPlace.place_id,
          address: selectedPlace.formatted_address,
          lat: selectedPlace.geometry.lat,
          lng: selectedPlace.geometry.lng,
          photo_url: details?.photo_url || selectedPlace.photos?.[0] || null,
          rating: selectedPlace.rating || null,
          price_level: selectedPlace.price_level ?? null,
          created_by: currentUserId,
        };
      } else {
        if (!name.trim()) {
          toast({
            title: "Error",
            description: "Please enter a name",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }

        itemData = {
          list_id: listId,
          parent_item_id: parentItemId,
          name: name.trim(),
          notes: notes.trim() || null,
          item_order: existingItemCount,
          is_place: false,
          created_by: currentUserId,
        };
      }

      const { error } = await supabase.from("list_items").insert(itemData);

      if (error) throw error;

      toast({
        title: "Item added",
        description: parentItemId
          ? "Option added successfully"
          : `"${itemData.name}" has been added`,
      });

      onOpenChange(false);
      onItemAdded();
    } catch (error) {
      console.error("Error adding item:", error);
      toast({
        title: "Error",
        description: "Failed to add item",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = mode === "search" ? !!selectedPlace : name.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {parentItemId ? "Add Option" : "Add Item"}
          </DialogTitle>
          <DialogDescription>
            {parentItemId
              ? "Add a specific place or option to this item."
              : "Search for a place or add a text entry."}
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
              Search Place
            </Button>
            <Button
              variant={mode === "text" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("text")}
            >
              <MapPin className="mr-1 h-4 w-4" />
              Text Entry
            </Button>
          </div>
        )}

        {mode === "search" && isGoogleMapsConfigured() ? (
          <div className="space-y-4">
            {/* Search input */}
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search for a place..."
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

              {/* No results */}
              {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && !selectedPlace && (
                <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg p-3 text-center text-sm text-muted-foreground">
                  No places found. Try a different search or use text entry.
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

            {/* Notes field */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Recommended by friend"
              />
            </div>
          </div>
        ) : (
          /* Text entry form */
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={parentItemId ? "e.g., Ichiran Shibuya" : "e.g., Tonkotsu Ramen"}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Best known for rich broth"
              />
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
          <Button onClick={handleAddItem} disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              parentItemId ? "Add Option" : "Add Item"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
