import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { MapPin, Clock, Users, Check, HelpCircle, X } from "lucide-react";
import { ItineraryWithDetails } from "../../lib/types";
import { cn } from "../../lib/utils";

interface ItineraryCardProps {
  itinerary: ItineraryWithDetails;
  currentUserId: string;
  onClick: () => void;
  onRSVP: (itineraryId: string, status: "going" | "maybe" | "not_going") => void;
}

export function ItineraryCard({
  itinerary,
  currentUserId,
  onClick,
  onRSVP,
}: ItineraryCardProps) {
  const currentUserParticipation = itinerary.participants.find(
    (p) => p.user_id === currentUserId
  );
  const currentStatus = currentUserParticipation?.status;
  const isCreator = itinerary.created_by === currentUserId;

  const goingCount = itinerary.participants.filter(
    (p) => p.status === "going"
  ).length;
  const stopCount = itinerary.stops.length;

  // Calculate total estimated time
  const totalMinutes = itinerary.stops.reduce(
    (sum, s) => sum + (s.stop.estimated_duration_minutes || 60),
    0
  );
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      style={{ borderLeftColor: itinerary.color, borderLeftWidth: 4 }}
    >
      <CardHeader className="pb-2" onClick={onClick}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: itinerary.color }}
              />
              {itinerary.name}
            </CardTitle>
            {itinerary.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {itinerary.description}
              </p>
            )}
          </div>
          {isCreator && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
              Owner
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats row */}
        <div className="flex flex-wrap gap-4 text-sm" onClick={onClick}>
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {stopCount} {stopCount === 1 ? "stop" : "stops"}
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-4 w-4" />
            {hours > 0 ? `${hours}h ` : ""}
            {minutes > 0 ? `${minutes}m` : hours === 0 ? "0m" : ""}
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Users className="h-4 w-4" />
            {goingCount} going
          </div>
        </div>

        {/* Stop previews */}
        {stopCount > 0 && (
          <div
            className="flex flex-wrap gap-1 text-xs text-muted-foreground"
            onClick={onClick}
          >
            {itinerary.stops.slice(0, 3).map((is, idx) => (
              <span key={is.id} className="flex items-center">
                {idx > 0 && <span className="mx-1">→</span>}
                <span className="truncate max-w-[100px]">{is.stop.name}</span>
              </span>
            ))}
            {stopCount > 3 && (
              <span className="text-muted-foreground">
                +{stopCount - 3} more
              </span>
            )}
          </div>
        )}

        {/* RSVP buttons */}
        <div
          className="flex gap-2 pt-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            size="sm"
            variant={currentStatus === "going" ? "default" : "outline"}
            onClick={() => onRSVP(itinerary.id, "going")}
            className={cn(
              "flex-1",
              currentStatus === "going" && "bg-green-600 hover:bg-green-700"
            )}
          >
            <Check className="mr-1 h-3 w-3" />
            Going
          </Button>
          <Button
            size="sm"
            variant={currentStatus === "maybe" ? "default" : "outline"}
            onClick={() => onRSVP(itinerary.id, "maybe")}
            className={cn(
              "flex-1",
              currentStatus === "maybe" && "bg-yellow-600 hover:bg-yellow-700"
            )}
          >
            <HelpCircle className="mr-1 h-3 w-3" />
            Maybe
          </Button>
          <Button
            size="sm"
            variant={currentStatus === "not_going" ? "default" : "outline"}
            onClick={() => onRSVP(itinerary.id, "not_going")}
            className={cn(
              "flex-1",
              currentStatus === "not_going" && "bg-red-600 hover:bg-red-700"
            )}
          >
            <X className="mr-1 h-3 w-3" />
            No
          </Button>
        </div>

        {/* Participants preview */}
        {itinerary.participants.length > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <div className="flex -space-x-2">
              {itinerary.participants
                .filter((p) => p.status === "going")
                .slice(0, 4)
                .map((participant) => (
                  <Avatar
                    key={participant.id}
                    className="h-6 w-6 border-2 border-background"
                  >
                    <AvatarImage src={participant.profile?.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {getInitials(
                        participant.profile?.display_name ||
                          participant.profile?.full_name ||
                          "?"
                      )}
                    </AvatarFallback>
                  </Avatar>
                ))}
            </div>
            {goingCount > 4 && (
              <span className="text-xs text-muted-foreground">
                +{goingCount - 4} more
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
