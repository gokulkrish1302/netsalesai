import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function SortableWidget({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("group/widget relative", isDragging && "z-10 opacity-70")}
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        className="absolute -left-1 top-2 z-10 hidden h-7 w-7 cursor-grab items-center justify-center rounded-md border border-border/60 bg-background/80 text-muted-foreground opacity-0 shadow-sm backdrop-blur transition group-hover/widget:flex group-hover/widget:opacity-100 hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      {children}
    </div>
  );
}
