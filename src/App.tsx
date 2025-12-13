import { useState, createContext, useCallback } from "react";
import "./App.css";
import Auth from "./components/Auth";
import TravelCostCalculator from "./components/TravelCostCalculator";
import supabase from "./lib/createClient";
import { Session } from "@supabase/supabase-js";
import { useEffect } from "react";
import { GroupMember, PendingMember } from "./lib/types";
import Navbar from "./components/Navbar";
import AllExpensesParent from "./components/AllExpenses/AllExpensesParent";
import { Toaster } from "./components/ui/toaster";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { ItineraryList } from "./components/Itinerary";
import { ListsTab } from "./components/Lists";

export const SessionContext = createContext<Session | null>(null);

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load all members (registered + pending)
  const loadAllMembers = useCallback(async () => {
    // Load registered profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*");

    if (profilesError) {
      console.error("Error loading profiles:", profilesError);
      return;
    }

    // Only include active members in the selectable list
    const registeredMembers: GroupMember[] = (profiles || [])
      .filter((member) => member.is_active !== false) // Include members where is_active is true or undefined (for backwards compat)
      .map((member) => ({
        id: member.id,
        full_name: member.full_name,
        display_name: member.display_name,
        email: member.email,
        avatar_url: member.avatar_url,
        isPending: false,
        is_active: member.is_active,
      }));

    // Load pending members (invited but not signed up)
    const { data: pending, error: pendingError } = await supabase
      .from("pending_members")
      .select("*");

    if (pendingError) {
      // Table might not exist yet, just use registered members
      console.warn("Could not load pending members:", pendingError);
      setGroupMembers(registeredMembers);
      return;
    }

    const pendingMembers: GroupMember[] = (pending || []).map((member: PendingMember) => ({
      id: member.id,
      full_name: member.display_name,
      display_name: member.display_name,
      email: member.email,
      isPending: true,
    }));

    // Combine both lists, registered first
    setGroupMembers([...registeredMembers, ...pendingMembers]);
  }, []);

  // check if session is already logged in
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setSession(null);
      } else if (session) {
        setSession(session);
      }
    });

    loadAllMembers();

    return () => {
      subscription.unsubscribe();
    };
  }, [loadAllMembers]);

  // Japan trip locations
  const locations = [
    "Tokyo",
    "Kyoto",
    "Osaka",
    "Nara",
    "Hiroshima",
    "Hakone",
    "Nikko",
    "Other",
  ];

  const categories = [
    "Food",
    "Transportation",
    "Accommodation",
    "Entertainment",
    "Shopping",
    "Activities",
    "Other",
  ];

  const [isLoading, setIsLoading] = useState(false);

  // Handler to refresh expenses when a new one is added
  const handleExpenseAdded = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <>
      <SessionContext.Provider value={session}>
        {session ? (
          <>
            <Navbar
              setIsLoading={setIsLoading}
              fullName={session.user.user_metadata.full_name || ""}
              email={session.user.email || ""}
              userId={session.user.id}
              avatarUrl={session.user.user_metadata.avatar_url}
            />

            <div className="container mx-auto px-4 py-6">
              <Tabs defaultValue="expenses" className="w-full">
                <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-6">
                  <TabsTrigger value="expenses">Expenses</TabsTrigger>
                  <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
                  <TabsTrigger value="lists">Lists</TabsTrigger>
                </TabsList>

                <TabsContent value="expenses" className="space-y-6">
                  <TravelCostCalculator
                    groupMembers={groupMembers}
                    locations={locations}
                    categories={categories}
                    session={session}
                    onExpenseAdded={handleExpenseAdded}
                    onMemberInvited={loadAllMembers}
                  />
                  <AllExpensesParent key={refreshKey} />
                </TabsContent>

                <TabsContent value="itinerary">
                  <ItineraryList
                    currentUserId={session.user.id}
                    groupMembers={groupMembers}
                  />
                </TabsContent>

                <TabsContent value="lists">
                  <ListsTab
                    currentUserId={session.user.id}
                    groupMembers={groupMembers}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </>
        ) : (
          <Auth setIsLoading={setIsLoading} isLoading={isLoading} />
        )}
      </SessionContext.Provider>
      <Toaster />
    </>
  );
}

export default App;
