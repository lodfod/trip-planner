import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Utensils,
  ShoppingBag,
  Target,
  Landmark,
  FileText,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { List, ListCategory } from "../../lib/types";

interface ListCardProps {
  list: List;
  onClick: () => void;
}

const CATEGORY_ICONS: Record<ListCategory, React.ReactNode> = {
  restaurants: <Utensils className="h-5 w-5" />,
  shopping: <ShoppingBag className="h-5 w-5" />,
  activities: <Target className="h-5 w-5" />,
  sightseeing: <Landmark className="h-5 w-5" />,
  custom: <FileText className="h-5 w-5" />,
};

export function ListCard({ list, onClick }: ListCardProps) {
  // Count items (top-level only) and checked items
  const topLevelItems = list.items || [];
  const totalItems = topLevelItems.length;
  const checkedItems = topLevelItems.filter((item) => item.is_checked).length;

  // Count all items including children
  const allItemsCount = topLevelItems.reduce((count, item) => {
    return count + 1 + (item.children?.length || 0);
  }, 0);
  const allCheckedCount = topLevelItems.reduce((count, item) => {
    const childrenChecked =
      item.children?.filter((c) => c.is_checked).length || 0;
    return count + (item.is_checked ? 1 : 0) + childrenChecked;
  }, 0);

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${list.color}20` }}
          >
            <div style={{ color: list.color }}>
              {CATEGORY_ICONS[list.category as ListCategory] ||
                CATEGORY_ICONS.custom}
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            {allCheckedCount > 0 ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <Circle className="h-4 w-4" />
            )}
            <span>
              {allCheckedCount}/{allItemsCount}
            </span>
          </div>
        </div>
        <CardTitle className="text-lg mt-2">{list.name}</CardTitle>
        {list.description && (
          <p className="text-sm text-muted-foreground line-clamp-1">
            {list.description}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {totalItems > 0 ? (
          <div className="space-y-1">
            {topLevelItems.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                {item.is_checked ? (
                  <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                ) : (
                  <Circle className="h-3 w-3 flex-shrink-0" />
                )}
                <span
                  className={`truncate ${item.is_checked ? "line-through" : ""}`}
                >
                  {item.name}
                </span>
                {item.children && item.children.length > 0 && (
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    +{item.children.length}
                  </span>
                )}
              </div>
            ))}
            {totalItems > 3 && (
              <p className="text-xs text-muted-foreground">
                +{totalItems - 3} more items
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No items yet</p>
        )}
      </CardContent>
    </Card>
  );
}
