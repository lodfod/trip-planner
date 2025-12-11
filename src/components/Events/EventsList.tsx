import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Plus, CalendarDays } from "lucide-react";
import supabase from "../../lib/createClient";
import { EventWithParticipants, GroupMember } from "../../lib/types";
import { EventCard } from "./EventCard";
import { CreateEventDialog } from "./CreateEventDialog";
import { useToast } from "../../hooks/use-toast";
import { format } from "date-fns";

interface EventsListProps {
  currentUserId: string;
  groupMembers: GroupMember[]; // Available for future use (auto-split expenses by event)
}

export function EventsList({
  currentUserId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  groupMembers,
}: EventsListProps) {
  const [events, setEvents] = useState<EventWithParticipants[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  // Fetch events with participants
  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select(
          `
          *,
          creator_profile:profiles!events_created_by_fkey (
            full_name,
            display_name
          ),
          event_participants (
            id,
            user_id,
            status,
            profile:profiles!event_participants_user_id_fkey (
              full_name,
              display_name,
              avatar_url
            )
          )
        `
        )
        .order("event_date", { ascending: true });

      if (error) throw error;

      const processedEvents: EventWithParticipants[] = data.map((event) => ({
        ...event,
        participants: event.event_participants.map((p: {
          id: string;
          user_id: string;
          status: "going" | "maybe" | "not_going";
          profile: { full_name: string; display_name?: string; avatar_url?: string };
        }) => ({
          id: p.id,
          event_id: event.id,
          user_id: p.user_id,
          status: p.status,
          profile: p.profile,
        })),
        creator_profile: event.creator_profile,
      }));

      setEvents(processedEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast({
        title: "Error",
        description: "Failed to load events",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Handle RSVP changes
  const handleRSVP = async (
    eventId: string,
    status: "going" | "maybe" | "not_going"
  ) => {
    try {
      // Check if user already has a participation record
      const existingParticipation = events
        .find((e) => e.id === eventId)
        ?.participants.find((p) => p.user_id === currentUserId);

      if (existingParticipation) {
        // Update existing
        const { error } = await supabase
          .from("event_participants")
          .update({ status })
          .eq("id", existingParticipation.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase.from("event_participants").insert({
          event_id: eventId,
          user_id: currentUserId,
          status,
        });

        if (error) throw error;
      }

      // Refresh events
      await fetchEvents();

      toast({
        title: "RSVP updated",
        description: `You're ${status === "going" ? "going" : status === "maybe" ? "maybe going" : "not going"}`,
      });
    } catch (error) {
      console.error("Error updating RSVP:", error);
      toast({
        title: "Error",
        description: "Failed to update RSVP",
        variant: "destructive",
      });
    }
  };

  // Handle event deletion
  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId);

      if (error) throw error;

      await fetchEvents();
      toast({
        title: "Event deleted",
        description: "The event has been removed",
      });
    } catch (error) {
      console.error("Error deleting event:", error);
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      });
    }
  };

  // Group events by date
  const groupedEvents = events.reduce(
    (groups, event) => {
      const date = event.event_date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(event);
      return groups;
    },
    {} as Record<string, EventWithParticipants[]>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading events...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with create button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Trip Itinerary</h2>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Event
        </Button>
      </div>

      {/* Events list */}
      {events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No events yet</h3>
            <p className="text-muted-foreground mb-4">
              Start planning your trip by adding activities and events.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Event
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedEvents)
            .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
            .map(([date, dateEvents]) => (
              <div key={date}>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  {format(new Date(date), "EEEE, MMMM d, yyyy")}
                </h3>
                <div className="space-y-4">
                  {dateEvents
                    .sort((a, b) => {
                      if (!a.event_time) return 1;
                      if (!b.event_time) return -1;
                      return a.event_time.localeCompare(b.event_time);
                    })
                    .map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        currentUserId={currentUserId}
                        onRSVP={handleRSVP}
                        onDelete={handleDeleteEvent}
                      />
                    ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Create event dialog */}
      <CreateEventDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        currentUserId={currentUserId}
        onEventCreated={fetchEvents}
      />
    </div>
  );
}
