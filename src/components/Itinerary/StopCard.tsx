import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  MapPin,
  Clock,
  MoreVertical,
  Trash2,
  ExternalLink,
  Star,
  Globe,
  Phone,
} from "lucide-react";
import { Stop, StopCategory } from "../../lib/types";
import { cn } from "../../lib/utils";

interface StopCardProps {
  stop: Stop;
  order?: number;
  arrivalTime?: string;
  departureTime?: string;
  notes?: string;
  isOptional?: boolean;
  canEdit?: boolean;
  onRemove?: () => void;
  sharedWith?: string[]; // Names of other itineraries that share this stop
  showMap?: boolean; // Show mini map preview
}

// Get static map URL for a location
function getStaticMapUrl(lat: number, lng: number, zoom: number = 15): string {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return "";

  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=300x150&scale=2&maptype=roadmap&markers=color:red%7C${lat},${lng}&key=${apiKey}`;
}

// Category icons and colors
const CATEGORY_CONFIG: Record<
  StopCategory,
  { emoji: string; bgColor: string }
> = {
  food: { emoji: "🍜", bgColor: "bg-orange-100" },
  temple: { emoji: "⛩️", bgColor: "bg-red-100" },
  shrine: { emoji: "🏯", bgColor: "bg-red-100" },
  shopping: { emoji: "🛍️", bgColor: "bg-pink-100" },
  activity: { emoji: "🎯", bgColor: "bg-blue-100" },
  transport: { emoji: "🚃", bgColor: "bg-gray-100" },
  hotel: { emoji: "🏨", bgColor: "bg-purple-100" },
  scenic: { emoji: "🏔️", bgColor: "bg-green-100" },
  museum: { emoji: "🏛️", bgColor: "bg-amber-100" },
  entertainment: { emoji: "🎭", bgColor: "bg-indigo-100" },
  other: { emoji: "📍", bgColor: "bg-slate-100" },
};

export function StopCard({
  stop,
  order,
  arrivalTime,
  departureTime,
  notes,
  isOptional,
  canEdit,
  onRemove,
  sharedWith,
  showMap = true,
}: StopCardProps) {
  const categoryConfig = CATEGORY_CONFIG[stop.category] || CATEGORY_CONFIG.other;

  // Format time for display
  const formatTime = (time?: string) => {
    if (!time) return null;
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const openInMaps = () => {
    if (stop.lat && stop.lng) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${stop.lat},${stop.lng}`,
        "_blank"
      );
    } else if (stop.address) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          stop.address
        )}`,
        "_blank"
      );
    }
  };

  return (
    <Card className={cn("relative overflow-hidden", isOptional && "opacity-70 border-dashed")}>
      <CardContent className="py-4 px-3 sm:px-6">
        {/* Title row: Number + Name + Actions */}
        <div className="flex items-center gap-2 sm:gap-3 mb-2">
          {/* Order number / Category icon */}
          <div
            className={cn(
              "flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-lg sm:text-xl",
              categoryConfig.bgColor
            )}
          >
            {order !== undefined ? (
              <span className="text-sm sm:text-base font-bold text-muted-foreground">
                {order}
              </span>
            ) : (
              categoryConfig.emoji
            )}
          </div>

          {/* Name */}
          <h4 className="font-medium text-sm sm:text-base truncate text-left flex-1 min-w-0">
            {stop.name}
            {isOptional && (
              <span className="text-xs bg-muted px-1.5 py-0.5 rounded ml-2">
                Optional
              </span>
            )}
          </h4>

          {/* Actions */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={openInMaps}
              title="Open in Google Maps"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>

            {canEdit && onRemove && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={onRemove}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove from itinerary
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Metadata - aligned with left edge of number badge */}
        <div className="text-left overflow-hidden">
          {/* Time range */}
          {(arrivalTime || departureTime) && (
            <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 text-left">
              <Clock className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">
                {formatTime(arrivalTime)}
                {arrivalTime && departureTime && " - "}
                {formatTime(departureTime)}
                {stop.estimated_duration_minutes && (
                  <span className="text-xs">
                    ({stop.estimated_duration_minutes} min)
                  </span>
                )}
              </span>
            </p>
          )}

          {/* Address */}
          {stop.address && (
            <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 mt-0.5 text-left">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{stop.address}</span>
            </p>
          )}

          {/* Rating */}
          {stop.rating && (
            <p className="text-xs sm:text-sm flex items-center gap-1 mt-0.5 text-left">
              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
              {stop.rating.toFixed(1)}
              {stop.price_level !== undefined && (
                <span className="text-muted-foreground ml-2">
                  {"$".repeat(stop.price_level + 1)}
                </span>
              )}
            </p>
          )}

          {/* Description or notes */}
          {(notes || stop.description) && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-2 line-clamp-2">
              {notes || stop.description}
            </p>
          )}

          {/* Photo and/or Map */}
          {(stop.photo_url || (showMap && stop.lat && stop.lng)) && (
            <div className="mt-3 flex gap-2">
              {stop.photo_url && (
                <img
                  src={stop.photo_url}
                  alt={stop.name}
                  className={cn(
                    "h-24 object-cover rounded-md",
                    showMap && stop.lat && stop.lng ? "w-1/2" : "w-full"
                  )}
                />
              )}
              {showMap && stop.lat && stop.lng && (
                <div
                  className={cn(
                    "h-24 rounded-md overflow-hidden cursor-pointer hover:opacity-90 transition-opacity",
                    stop.photo_url ? "w-1/2" : "w-full"
                  )}
                  onClick={openInMaps}
                  title="Click to open in Google Maps"
                >
                  <img
                    src={getStaticMapUrl(stop.lat, stop.lng)}
                    alt={`Map of ${stop.name}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          )}

          {/* Links */}
          {(stop.website || stop.phone) && (
            <div className="flex gap-3 mt-2 text-xs sm:text-sm">
              {stop.website && (
                <a
                  href={stop.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <Globe className="h-3 w-3" />
                  Website
                </a>
              )}
              {stop.phone && (
                <a
                  href={`tel:${stop.phone}`}
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <Phone className="h-3 w-3" />
                  {stop.phone}
                </a>
              )}
            </div>
          )}

          {/* Shared indicator */}
          {sharedWith && sharedWith.length > 0 && (
            <div className="mt-2 pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Also in:{" "}
                {sharedWith.map((name, i) => (
                  <span key={name}>
                    {i > 0 && ", "}
                    <span className="font-medium">{name}</span>
                  </span>
                ))}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
