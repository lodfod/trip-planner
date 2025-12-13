import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Plus, ListTodo } from "lucide-react";
import supabase from "../../lib/createClient";
import { List, ListItem, GroupMember } from "../../lib/types";
import { ListCard } from "./ListCard";
import { ListDetail } from "./ListDetail";
import { CreateListDialog } from "./CreateListDialog";
import { useToast } from "../../hooks/use-toast";

interface ListsTabProps {
  currentUserId: string;
  groupMembers: GroupMember[];
}

export function ListsTab({ currentUserId, groupMembers }: ListsTabProps) {
  const [lists, setLists] = useState<List[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<List | null>(null);
  const selectedListIdRef = useRef<string | null>(null);
  const { toast } = useToast();

  // Fetch lists with their items
  const fetchLists = useCallback(async () => {
    try {
      // First, get all lists
      const { data: listsData, error: listsError } = await supabase
        .from("lists")
        .select(
          `
          *,
          creator_profile:profiles!lists_created_by_fkey (
            full_name,
            display_name
          )
        `
        )
        .order("created_at", { ascending: false });

      if (listsError) throw listsError;

      // Then get all list items
      const { data: itemsData, error: itemsError } = await supabase
        .from("list_items")
        .select(
          `
          *,
          checked_profile:profiles!list_items_checked_by_fkey (
            full_name,
            display_name
          )
        `
        )
        .order("item_order", { ascending: true });

      if (itemsError) throw itemsError;

      // Process and nest items
      const processedLists: List[] = (listsData || []).map((list) => {
        const listItems = (itemsData || []).filter(
          (item: ListItem) => item.list_id === list.id
        );

        // Separate top-level items and children
        const topLevelItems = listItems.filter(
          (item: ListItem) => !item.parent_item_id
        );
        const childItems = listItems.filter(
          (item: ListItem) => item.parent_item_id
        );

        // Attach children to their parents
        const itemsWithChildren = topLevelItems.map((item: ListItem) => ({
          ...item,
          children: childItems.filter(
            (child: ListItem) => child.parent_item_id === item.id
          ),
        }));

        return {
          ...list,
          items: itemsWithChildren,
        };
      });

      setLists(processedLists);

      // Update selectedList if it exists
      const currentSelectedId = selectedListIdRef.current;
      if (currentSelectedId) {
        const updated = processedLists.find((l) => l.id === currentSelectedId);
        if (updated) {
          setSelectedList(updated);
        } else {
          setSelectedList(null);
          selectedListIdRef.current = null;
        }
      }
    } catch (error) {
      console.error("Error fetching lists:", error);
      toast({
        title: "Error",
        description: "Failed to load lists",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  // Handle list deletion
  const handleDeleteList = async (listId: string) => {
    try {
      // First delete all items in the list
      await supabase
        .from("list_items")
        .delete()
        .eq("list_id", listId);

      // Then delete the list itself
      const { error, count } = await supabase
        .from("lists")
        .delete()
        .eq("id", listId)
        .select();

      if (error) throw error;

      // Check if anything was actually deleted
      const { data: checkList } = await supabase
        .from("lists")
        .select("id")
        .eq("id", listId)
        .single();

      if (checkList) {
        throw new Error("Delete was blocked by RLS policy. Check Supabase permissions.");
      }

      selectedListIdRef.current = null;
      setSelectedList(null);
      await fetchLists();

      toast({
        title: "List deleted",
        description: "The list has been removed",
      });
    } catch (error) {
      console.error("Error deleting list:", error);
      toast({
        title: "Error",
        description: `Failed to delete list: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading lists...</div>
      </div>
    );
  }

  // Show detail view if a list is selected
  if (selectedList) {
    return (
      <ListDetail
        list={selectedList}
        currentUserId={currentUserId}
        groupMembers={groupMembers}
        onBack={() => {
          selectedListIdRef.current = null;
          setSelectedList(null);
        }}
        onUpdate={fetchLists}
        onDelete={() => handleDeleteList(selectedList.id)}
      />
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* Header with create button */}
      <div className="flex items-center justify-between">
        <div className="text-left">
          <h2 className="text-2xl font-bold text-left">Lists</h2>
          <p className="text-sm text-muted-foreground mt-1 text-left">
            Create lists of places and ideas
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New List
        </Button>
      </div>

      {/* Lists grid */}
      {lists.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ListTodo className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2 text-[#666666]">
              No lists yet
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create lists to save places you want to visit
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create First List
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => (
            <ListCard
              key={list.id}
              list={list}
              onClick={() => {
                selectedListIdRef.current = list.id;
                setSelectedList(list);
              }}
            />
          ))}
        </div>
      )}

      {/* Create list dialog */}
      <CreateListDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        currentUserId={currentUserId}
        onListCreated={fetchLists}
      />
    </div>
  );
}
