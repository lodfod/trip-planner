import { useState } from "react";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import {
  ChevronDown,
  ChevronRight,
  MapPin,
  Star,
  Trash2,
  Plus,
  ExternalLink,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { ListItem } from "../../lib/types";

interface ListItemRowProps {
  item: ListItem;
  onToggleCheck: (item: ListItem) => void;
  onDelete: (itemId: string) => void;
  onAddOption: (parentId: string) => void;
  onEdit: (itemId: string, name: string, notes: string | null) => void;
  currentUserId: string;
  depth?: number;
}

export function ListItemRow({
  item,
  onToggleCheck,
  onDelete,
  onAddOption,
  onEdit,
  currentUserId,
  depth = 0,
}: ListItemRowProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editNotes, setEditNotes] = useState(item.notes || "");
  const hasChildren = item.children && item.children.length > 0;

  const handleSaveEdit = () => {
    if (editName.trim()) {
      onEdit(item.id, editName.trim(), editNotes.trim() || null);
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditName(item.name);
    setEditNotes(item.notes || "");
    setIsEditing(false);
  };

  // Generate Google Maps URL for place items
  const getMapsUrl = () => {
    if (item.google_place_id) {
      return `https://www.google.com/maps/place/?q=place_id:${item.google_place_id}`;
    }
    if (item.lat && item.lng) {
      return `https://www.google.com/maps?q=${item.lat},${item.lng}`;
    }
    return null;
  };

  const mapsUrl = getMapsUrl();

  return (
    <div>
      <div
        className={`group flex items-start gap-2 py-2 px-2 rounded-lg hover:bg-muted/50 ${
          depth > 0 ? "ml-6 border-l-2 border-muted pl-4" : ""
        }`}
      >
        {/* Expand/collapse button for items with children */}
        {hasChildren ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0 mt-0.5"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        ) : (
          <div className="w-5 shrink-0" />
        )}

        {/* Checkbox */}
        <Checkbox
          checked={item.is_checked}
          onCheckedChange={() => onToggleCheck(item)}
          className="mt-1 shrink-0"
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            /* Edit mode */
            <div className="space-y-2">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Item name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveEdit();
                  if (e.key === "Escape") handleCancelEdit();
                }}
              />
              <Input
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Notes (optional)"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveEdit();
                  if (e.key === "Escape") handleCancelEdit();
                }}
              />
              <div className="flex gap-1">
                <Button size="sm" onClick={handleSaveEdit}>
                  <Check className="h-3 w-3 mr-1" />
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            /* View mode */
            <>
              <div className="flex items-start gap-2">
                <span
                  className={`font-medium ${
                    item.is_checked ? "line-through text-muted-foreground" : ""
                  }`}
                >
                  {item.name}
                </span>
                {item.is_place && <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />}
              </div>

              {/* Place details */}
              {item.is_place && (
                <div className="text-sm text-muted-foreground mt-0.5 space-y-0.5">
                  {item.address && (
                    <p className="line-clamp-1">{item.address}</p>
                  )}
                  <div className="flex items-center gap-2">
                    {item.rating && (
                      <span className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        {item.rating}
                      </span>
                    )}
                    {item.price_level !== undefined && item.price_level !== null && (
                      <span>{"$".repeat(item.price_level + 1)}</span>
                    )}
                    {mapsUrl && (
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3 w-3" />
                        Maps
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {item.notes && (
                <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
              )}

              {/* Checked info */}
              {item.is_checked && item.checked_profile && (
                <p className="text-xs text-muted-foreground mt-1">
                  Checked by {item.checked_profile.display_name || item.checked_profile.full_name}
                </p>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        {!isEditing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            {/* Edit button - only for text items, not places */}
            {!item.is_place && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsEditing(true)}
                title="Edit"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {depth === 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onAddOption(item.id)}
                title="Add option"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(item.id)}
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="mt-1">
          {item.children!.map((child) => (
            <ListItemRow
              key={child.id}
              item={child}
              onToggleCheck={onToggleCheck}
              onDelete={onDelete}
              onAddOption={onAddOption}
              onEdit={onEdit}
              currentUserId={currentUserId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
