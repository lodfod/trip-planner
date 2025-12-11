import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Plus, Map, CalendarDays } from "lucide-react";
import supabase from "../../lib/createClient";
import { ItineraryWithDetails, GroupMember } from "../../lib/types";
import { ItineraryCard } from "./ItineraryCard";
import { ItineraryDetail } from "./ItineraryDetail";
import { CreateItineraryDialog } from "./CreateItineraryDialog";
import { useToast } from "../../hooks/use-toast";
import { format } from "date-fns";

interface ItineraryListProps {
  currentUserId: string;
  groupMembers: GroupMember[];
}

export function ItineraryList({
  currentUserId,
  groupMembers,
}: ItineraryListProps) {
  const [itineraries, setItineraries] = useState<ItineraryWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedItinerary, setSelectedItinerary] =
    useState<ItineraryWithDetails | null>(null);
  const selectedItineraryIdRef = useRef<string | null>(null);
  const { toast } = useToast();

  // Fetch itineraries with their stops and participants
  const fetchItineraries = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("itineraries")
        .select(
          `
          *,
          creator_profile:profiles!itineraries_created_by_fkey (
            full_name,
            display_name
          ),
          itinerary_stops (
            id,
            stop_order,
            planned_arrival_time,
            planned_departure_time,
            notes,
            is_optional,
            stop:stops (
              id,
              name,
              description,
              address,
              lat,
              lng,
              google_place_id,
              estimated_duration_minutes,
              category,
              opening_hours,
              photo_url,
              rating
            )
          ),
          itinerary_participants (
            id,
            user_id,
            status,
            profile:profiles!itinerary_participants_user_id_fkey (
              full_name,
              display_name,
              avatar_url
            )
          )
        `
        )
        .order("date", { ascending: true });

      if (error) throw error;

      const processedItineraries: ItineraryWithDetails[] = (data || []).map(
        (itinerary) => ({
          ...itinerary,
          stops: (itinerary.itinerary_stops || [])
            .sort(
              (a: { stop_order: number }, b: { stop_order: number }) =>
                a.stop_order - b.stop_order
            )
            .map((is: Record<string, unknown>) => ({
              ...is,
              stop: is.stop,
            })),
          participants: (itinerary.itinerary_participants || []).map(
            (ip: Record<string, unknown>) => ({
              ...ip,
              profile: ip.profile,
            })
          ),
          creator_profile: itinerary.creator_profile,
        })
      );

      setItineraries(processedItineraries);

      // Update selectedItinerary if it exists (to reflect changes like removed stops)
      // Use ref to get current selection ID to avoid stale closure issues
      const currentSelectedId = selectedItineraryIdRef.current;
      if (currentSelectedId) {
        const updated = processedItineraries.find(
          (i) => i.id === currentSelectedId
        );
        if (updated) {
          setSelectedItinerary(updated);
        } else {
          // Itinerary was deleted
          setSelectedItinerary(null);
          selectedItineraryIdRef.current = null;
        }
      }
    } catch (error) {
      console.error("Error fetching itineraries:", error);
      toast({
        title: "Error",
        description: "Failed to load itineraries",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedItinerary, toast]);

  useEffect(() => {
    fetchItineraries();
  }, [fetchItineraries]);

  // Handle RSVP changes
  const handleRSVP = async (
    itineraryId: string,
    status: "going" | "maybe" | "not_going"
  ) => {
    try {
      const existingParticipation = itineraries
        .find((i) => i.id === itineraryId)
        ?.participants.find((p) => p.user_id === currentUserId);

      if (existingParticipation) {
        const { error } = await supabase
          .from("itinerary_participants")
          .update({ status })
          .eq("id", existingParticipation.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("itinerary_participants").insert({
          itinerary_id: itineraryId,
          user_id: currentUserId,
          status,
        });

        if (error) throw error;
      }

      await fetchItineraries();

      toast({
        title: "RSVP updated",
        description: `You're ${
          status === "going"
            ? "going"
            : status === "maybe"
            ? "maybe going"
            : "not going"
        }`,
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

  // Handle itinerary deletion
  const handleDeleteItinerary = async (itineraryId: string) => {
    try {
      const { error } = await supabase
        .from("itineraries")
        .delete()
        .eq("id", itineraryId);

      if (error) throw error;

      selectedItineraryIdRef.current = null;
      setSelectedItinerary(null);
      await fetchItineraries();

      toast({
        title: "Itinerary deleted",
        description: "The itinerary has been removed",
      });
    } catch (error) {
      console.error("Error deleting itinerary:", error);
      toast({
        title: "Error",
        description: "Failed to delete itinerary",
        variant: "destructive",
      });
    }
  };

  // Group itineraries by date
  const groupedItineraries = itineraries.reduce((groups, itinerary) => {
    const date = itinerary.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(itinerary);
    return groups;
  }, {} as Record<string, ItineraryWithDetails[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading itineraries...</div>
      </div>
    );
  }

  // Show detail view if an itinerary is selected
  if (selectedItinerary) {
    return (
      <ItineraryDetail
        itinerary={selectedItinerary}
        currentUserId={currentUserId}
        groupMembers={groupMembers}
        onBack={() => {
          selectedItineraryIdRef.current = null;
          setSelectedItinerary(null);
        }}
        onUpdate={fetchItineraries}
        onDelete={() => handleDeleteItinerary(selectedItinerary.id)}
        onRSVP={handleRSVP}
      />
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* Header with create button */}
      <div className="flex items-center justify-between">
        <div className="text-left">
          <h2 className="text-2xl font-bold text-left">Trip Itineraries</h2>
          <p className="text-sm text-muted-foreground mt-1 text-left">
            Create itineraries for different days
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Itinerary
        </Button>
      </div>

      {/* Itineraries list */}
      {itineraries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Map className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2 text-[#666666]">
              No itineraries yet
            </h3>

            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Itinerary
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8 text-left">
          {Object.entries(groupedItineraries)
            .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
            .map(([date, dateItineraries]) => (
              <div key={date} className="text-left">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 justify-start">
                  <CalendarDays className="h-5 w-5" />
                  {format(new Date(date), "EEEE, MMMM d, yyyy")}
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {dateItineraries.map((itinerary) => (
                    <ItineraryCard
                      key={itinerary.id}
                      itinerary={itinerary}
                      currentUserId={currentUserId}
                      onClick={() => {
                        selectedItineraryIdRef.current = itinerary.id;
                        setSelectedItinerary(itinerary);
                      }}
                      onRSVP={handleRSVP}
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Create itinerary dialog */}
      <CreateItineraryDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        currentUserId={currentUserId}
        onItineraryCreated={fetchItineraries}
      />
    </div>
  );
}
