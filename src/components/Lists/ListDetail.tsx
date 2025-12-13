import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  ArrowLeft,
  Plus,
  Trash2,
  MoreVertical,
  Utensils,
  ShoppingBag,
  Target,
  Landmark,
  FileText,
  Pencil,
  Check,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { List, ListItem as ListItemType, GroupMember, ListCategory } from "../../lib/types";
import { ListItemRow } from "./ListItem";
import { AddItemDialog } from "./AddItemDialog";
import supabase from "../../lib/createClient";
import { useToast } from "../../hooks/use-toast";

interface ListDetailProps {
  list: List;
  currentUserId: string;
  groupMembers: GroupMember[];
  onBack: () => void;
  onUpdate: () => void;
  onDelete: () => void;
}

const CATEGORY_ICONS: Record<ListCategory, React.ReactNode> = {
  restaurants: <Utensils className="h-5 w-5" />,
  shopping: <ShoppingBag className="h-5 w-5" />,
  activities: <Target className="h-5 w-5" />,
  sightseeing: <Landmark className="h-5 w-5" />,
  custom: <FileText className="h-5 w-5" />,
};

export function ListDetail({
  list,
  currentUserId,
  groupMembers,
  onBack,
  onUpdate,
  onDelete,
}: ListDetailProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addingToParent, setAddingToParent] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditingList, setIsEditingList] = useState(false);
  const [editListName, setEditListName] = useState(list.name);
  const [editListDescription, setEditListDescription] = useState(list.description || "");
  const { toast } = useToast();

  // Handle editing list name/description
  const handleSaveListEdit = async () => {
    if (!editListName.trim()) return;

    try {
      const { error } = await supabase
        .from("lists")
        .update({
          name: editListName.trim(),
          description: editListDescription.trim() || null,
        })
        .eq("id", list.id);

      if (error) throw error;

      toast({
        title: "List updated",
        description: "List name has been updated",
      });

      setIsEditingList(false);
      onUpdate();
    } catch (error) {
      console.error("Error updating list:", error);
      toast({
        title: "Error",
        description: "Failed to update list",
        variant: "destructive",
      });
    }
  };

  const handleCancelListEdit = () => {
    setEditListName(list.name);
    setEditListDescription(list.description || "");
    setIsEditingList(false);
  };

  const items = list.items || [];

  // Handle checking/unchecking an item
  const handleToggleCheck = async (item: ListItemType) => {
    try {
      const { error } = await supabase
        .from("list_items")
        .update({
          is_checked: !item.is_checked,
          checked_by: !item.is_checked ? currentUserId : null,
          checked_at: !item.is_checked ? new Date().toISOString() : null,
        })
        .eq("id", item.id);

      if (error) throw error;
      onUpdate();
    } catch (error) {
      console.error("Error toggling item:", error);
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive",
      });
    }
  };

  // Handle deleting an item
  const handleDeleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("list_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      toast({
        title: "Item deleted",
        description: "The item has been removed",
      });

      onUpdate();
    } catch (error) {
      console.error("Error deleting item:", error);
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    }
  };

  // Handle editing an item
  const handleEditItem = async (itemId: string, name: string, notes: string | null) => {
    try {
      const { error } = await supabase
        .from("list_items")
        .update({ name, notes })
        .eq("id", itemId);

      if (error) throw error;

      toast({
        title: "Item updated",
        description: "The item has been updated",
      });

      onUpdate();
    } catch (error) {
      console.error("Error editing item:", error);
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive",
      });
    }
  };

  // Open add dialog for adding option to parent
  const handleAddOption = (parentId: string) => {
    setAddingToParent(parentId);
    setIsAddDialogOpen(true);
  };

  // Count stats
  const allItemsCount = items.reduce((count, item) => {
    return count + 1 + (item.children?.length || 0);
  }, 0);
  const allCheckedCount = items.reduce((count, item) => {
    const childrenChecked =
      item.children?.filter((c) => c.is_checked).length || 0;
    return count + (item.is_checked ? 1 : 0) + childrenChecked;
  }, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          {isEditingList ? (
            <div className="space-y-2">
              <Input
                value={editListName}
                onChange={(e) => setEditListName(e.target.value)}
                placeholder="List name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveListEdit();
                  if (e.key === "Escape") handleCancelListEdit();
                }}
              />
              <Input
                value={editListDescription}
                onChange={(e) => setEditListDescription(e.target.value)}
                placeholder="Description (optional)"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveListEdit();
                  if (e.key === "Escape") handleCancelListEdit();
                }}
              />
              <div className="flex gap-1">
                <Button size="sm" onClick={handleSaveListEdit}>
                  <Check className="h-3 w-3 mr-1" />
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancelListEdit}>
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div
                  className="p-1.5 rounded"
                  style={{ backgroundColor: `${list.color}20` }}
                >
                  <div style={{ color: list.color }}>
                    {CATEGORY_ICONS[list.category as ListCategory] ||
                      CATEGORY_ICONS.custom}
                  </div>
                </div>
                <h2 className="text-xl font-bold">{list.name}</h2>
              </div>
              {list.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {list.description}
                </p>
              )}
            </>
          )}
        </div>

        {!isEditingList && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditingList(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Rename List
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete List
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Progress bar */}
      <div className="bg-muted rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-green-500 transition-all"
          style={{
            width: allItemsCount > 0 ? `${(allCheckedCount / allItemsCount) * 100}%` : "0%",
          }}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        {allCheckedCount} of {allItemsCount} items checked
      </p>

      {/* Items list */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Items</CardTitle>
            <Button
              size="sm"
              onClick={() => {
                setAddingToParent(null);
                setIsAddDialogOpen(true);
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No items yet. Add your first item!</p>
            </div>
          ) : (
            <div className="space-y-1">
              {items.map((item) => (
                <ListItemRow
                  key={item.id}
                  item={item}
                  onToggleCheck={handleToggleCheck}
                  onDelete={handleDeleteItem}
                  onAddOption={handleAddOption}
                  onEdit={handleEditItem}
                  currentUserId={currentUserId}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add item dialog */}
      <AddItemDialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) setAddingToParent(null);
        }}
        listId={list.id}
        parentItemId={addingToParent}
        currentUserId={currentUserId}
        existingItemCount={items.length}
        onItemAdded={onUpdate}
      />

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete List</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{list.name}"? This will also
              delete all items in this list. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
