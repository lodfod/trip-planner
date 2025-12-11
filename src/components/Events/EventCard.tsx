import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
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
  Check,
  HelpCircle,
  X,
} from "lucide-react";
import { EventWithParticipants } from "../../lib/types";
import { cn } from "../../lib/utils";

interface EventCardProps {
  event: EventWithParticipants;
  currentUserId: string;
  onRSVP: (eventId: string, status: "going" | "maybe" | "not_going") => void;
  onDelete: (eventId: string) => void;
}

export function EventCard({
  event,
  currentUserId,
  onRSVP,
  onDelete,
}: EventCardProps) {
  const isCreator = event.created_by === currentUserId;
  const currentUserParticipation = event.participants.find(
    (p) => p.user_id === currentUserId
  );
  const currentStatus = currentUserParticipation?.status;

  const goingCount = event.participants.filter(
    (p) => p.status === "going"
  ).length;
  const maybeCount = event.participants.filter(
    (p) => p.status === "maybe"
  ).length;

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Format time display
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{event.name}</CardTitle>
            {event.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {event.description}
              </p>
            )}
          </div>
          {isCreator && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete(event.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Event
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Time and location */}
        <div className="flex flex-wrap gap-4 text-sm">
          {event.event_time && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              {formatTime(event.event_time)}
            </div>
          )}
          {event.location && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {event.location}
            </div>
          )}
          {event.google_maps_url && (
            <a
              href={event.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Map
            </a>
          )}
        </div>

        {/* RSVP buttons */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={currentStatus === "going" ? "default" : "outline"}
            onClick={() => onRSVP(event.id, "going")}
            className={cn(
              currentStatus === "going" && "bg-green-600 hover:bg-green-700"
            )}
          >
            <Check className="mr-1 h-4 w-4" />
            Going
          </Button>
          <Button
            size="sm"
            variant={currentStatus === "maybe" ? "default" : "outline"}
            onClick={() => onRSVP(event.id, "maybe")}
            className={cn(
              currentStatus === "maybe" && "bg-yellow-600 hover:bg-yellow-700"
            )}
          >
            <HelpCircle className="mr-1 h-4 w-4" />
            Maybe
          </Button>
          <Button
            size="sm"
            variant={currentStatus === "not_going" ? "default" : "outline"}
            onClick={() => onRSVP(event.id, "not_going")}
            className={cn(
              currentStatus === "not_going" && "bg-red-600 hover:bg-red-700"
            )}
          >
            <X className="mr-1 h-4 w-4" />
            Can't Go
          </Button>
        </div>

        {/* Participants */}
        {event.participants.length > 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {goingCount} going
                {maybeCount > 0 && `, ${maybeCount} maybe`}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {event.participants
                .filter((p) => p.status === "going")
                .map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center gap-1.5 bg-green-100 dark:bg-green-900/30 rounded-full px-2 py-1"
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={participant.profile?.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {getInitials(
                          participant.profile?.display_name ||
                            participant.profile?.full_name ||
                            "?"
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs">
                      {participant.profile?.display_name ||
                        participant.profile?.full_name?.split(" ")[0]}
                    </span>
                  </div>
                ))}
              {event.participants
                .filter((p) => p.status === "maybe")
                .map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center gap-1.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-full px-2 py-1"
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={participant.profile?.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {getInitials(
                          participant.profile?.display_name ||
                            participant.profile?.full_name ||
                            "?"
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs">
                      {participant.profile?.display_name ||
                        participant.profile?.full_name?.split(" ")[0]}{" "}
                      (maybe)
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
