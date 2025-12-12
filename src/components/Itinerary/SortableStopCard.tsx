import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { StopCard } from "./StopCard";
import { Stop } from "../../lib/types";

interface SortableStopCardProps {
  id: string;
  stop: Stop;
  order: number;
  arrivalTime?: string;
  departureTime?: string;
  notes?: string;
  isOptional: boolean;
  canEdit: boolean;
  onRemove: () => void;
}

export function SortableStopCard({
  id,
  stop,
  order,
  arrivalTime,
  departureTime,
  notes,
  isOptional,
  canEdit,
  onRemove,
}: SortableStopCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <StopCard
        stop={stop}
        order={order}
        arrivalTime={arrivalTime}
        departureTime={departureTime}
        notes={notes}
        isOptional={isOptional}
        canEdit={canEdit}
        onRemove={onRemove}
        dragHandleProps={canEdit ? { ...attributes, ...listeners } : undefined}
        isDragging={isDragging}
      />
    </div>
  );
}
