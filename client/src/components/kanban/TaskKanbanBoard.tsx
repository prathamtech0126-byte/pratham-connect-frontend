import { useEffect, useState } from "react";
import { PageWrapper } from "@/layout/PageWrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Calendar, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageHint } from "@/hooks/usePageHint";
import { ProductTour } from "@/components/ProductTour";

/**
 * Reusable daily/monthly task Kanban board (To do / In progress / Review / Done)
 * with drag-and-drop. Used by the CX and Binding teams. Board state is persisted
 * to localStorage per `boardKey` (demo persistence — swap for an API later).
 */

export type TaskStatus = "todo" | "inprogress" | "review" | "done";
export type TaskPriority = "high" | "medium" | "low";
export type TaskType = "auto" | "manual";

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  clientName: string;
  contextNote: string;
  priority: TaskPriority;
  dueTime: string;
  dueOverdue?: boolean;
  status: TaskStatus;
}

type ViewMode = "daily" | "monthly";

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: "todo", label: "TO DO", color: "text-blue-500" },
  { id: "inprogress", label: "IN PROGRESS", color: "text-orange-500" },
  { id: "review", label: "REVIEW", color: "text-purple-500" },
  { id: "done", label: "DONE", color: "text-green-500" },
];

const STAT_LABELS: Record<TaskStatus, string> = {
  todo: "To do", inprogress: "In progress", review: "Review", done: "Done",
};

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  high: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  medium: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
  low: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
};

const EMPTY_FORM = {
  title: "", clientName: "", contextNote: "",
  priority: "medium" as TaskPriority, dueTime: "", status: "todo" as TaskStatus,
};

/* ---------- localStorage persistence ---------- */

interface BoardState { daily: Task[]; monthly: Task[]; }

function loadBoard(boardKey: string, seedDaily: Task[], seedMonthly: Task[]): BoardState {
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(`kanban_${boardKey}`);
      if (raw) return JSON.parse(raw) as BoardState;
    } catch {
      /* ignore */
    }
  }
  return { daily: seedDaily, monthly: seedMonthly };
}

/* ---------- card + column ---------- */

function TaskCard({ task, onDragStart }: { task: Task; onDragStart: (id: string) => void }) {
  const hasPhone = task.contextNote.startsWith("Phone:");
  return (
    <div
      draggable
      onDragStart={() => onDragStart(task.id)}
      className="select-none rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md cursor-grab active:cursor-grabbing"
    >
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <p className="flex-1 text-sm font-semibold leading-snug text-foreground">{task.title}</p>
        <span className={cn(
          "flex-shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold",
          task.type === "auto"
            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
            : "border border-border bg-muted text-muted-foreground"
        )}>
          {task.type === "auto" ? "Auto" : "Manual"}
        </span>
      </div>

      <div className="mb-1 flex items-center gap-1.5">
        <span className="inline-block h-3.5 w-3.5 flex-shrink-0 rounded border border-border" />
        <span className="text-xs text-muted-foreground">{task.clientName}</span>
      </div>

      {task.contextNote && (
        <p className="mb-2 mt-1 text-xs leading-relaxed text-muted-foreground">
          {hasPhone ? (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3 flex-shrink-0" />
              {task.contextNote}
            </span>
          ) : task.contextNote}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium capitalize", PRIORITY_STYLE[task.priority])}>
          {task.priority}
        </span>
        <span className={cn("flex items-center gap-1 text-xs", task.dueOverdue ? "font-medium text-red-500" : "text-muted-foreground")}>
          <Calendar className="h-3 w-3" />
          {task.dueTime}
        </span>
      </div>
    </div>
  );
}

function KanbanColumn({
  col, tasks, onDragStart, onDrop, onAdd,
}: {
  col: typeof COLUMNS[0];
  tasks: Task[];
  onDragStart: (id: string) => void;
  onDrop: (colId: TaskStatus) => void;
  onAdd: (colId: TaskStatus) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  return (
    <div
      className={cn(
        "flex min-h-[420px] flex-col rounded-xl border bg-muted/20 transition-colors",
        dragOver ? "border-primary/50 bg-accent/20" : "border-border"
      )}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={() => { onDrop(col.id); setDragOver(false); }}
    >
      <div className="flex items-center justify-between px-4 pb-3 pt-4">
        <span className={cn("text-xs font-bold uppercase tracking-widest", col.color)}>{col.label}</span>
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
          {tasks.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 pb-2">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onDragStart={onDragStart} />
        ))}
      </div>
      <button
        onClick={() => onAdd(col.id)}
        className="mx-3 mb-3 mt-1 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2.5 text-xs text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" />
        Add
      </button>
    </div>
  );
}

/* ---------- board ---------- */

export function TaskKanbanBoard({
  boardKey,
  breadcrumbLabel,
  hintKey,
  seedDaily,
  seedMonthly,
}: {
  boardKey: string;
  breadcrumbLabel: string;
  hintKey: string;
  seedDaily: Task[];
  seedMonthly: Task[];
}) {
  const { showHint, dismissHint } = usePageHint(hintKey);
  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  const initial = loadBoard(boardKey, seedDaily, seedMonthly);
  const [dailyTasks, setDailyTasks] = useState<Task[]>(initial.daily);
  const [monthlyTasks, setMonthlyTasks] = useState<Task[]>(initial.monthly);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  // Persist every change to localStorage.
  useEffect(() => {
    try {
      window.localStorage.setItem(`kanban_${boardKey}`, JSON.stringify({ daily: dailyTasks, monthly: monthlyTasks }));
    } catch {
      /* ignore quota errors */
    }
  }, [boardKey, dailyTasks, monthlyTasks]);

  const tasks = viewMode === "daily" ? dailyTasks : monthlyTasks;
  const setTasks = viewMode === "daily" ? setDailyTasks : setMonthlyTasks;

  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const monthLabel = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  function handleDrop(colId: TaskStatus) {
    if (!draggingId) return;
    setTasks((prev) => prev.map((t) => (t.id === draggingId ? { ...t, status: colId } : t)));
    setDraggingId(null);
  }

  function openAdd(colId: TaskStatus) {
    setForm({ ...EMPTY_FORM, status: colId });
    setAddOpen(true);
  }

  function handleSave() {
    if (!form.title.trim() || !form.clientName.trim()) return;
    setTasks((prev) => [
      ...prev,
      {
        id: `t${Date.now()}`,
        title: form.title.trim(),
        type: "manual",
        clientName: form.clientName.trim(),
        contextNote: form.contextNote.trim(),
        priority: form.priority,
        dueTime: form.dueTime || "No due date",
        status: form.status,
      },
    ]);
    setAddOpen(false);
    setForm({ ...EMPTY_FORM });
  }

  const counts = Object.fromEntries(
    COLUMNS.map((c) => [c.id, tasks.filter((t) => t.status === c.id).length])
  ) as Record<TaskStatus, number>;

  return (
    <PageWrapper
      title={viewMode === "daily" ? "My Tasks — Today" : "My Tasks — This Month"}
      breadcrumbs={[{ label: breadcrumbLabel, href: "/" }, { label: "Board" }]}
      actions={
        <div className="flex items-center gap-2">
          <div data-tour="kanban-view-toggle" className="flex overflow-hidden rounded-lg border border-border">
            {(["daily", "monthly"] as const).map((m, i) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                  i === 1 && "border-l border-border",
                  viewMode === m ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {m}
              </button>
            ))}
          </div>
          <Button data-tour="kanban-add-task" size="sm" onClick={() => openAdd("todo")}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add task
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <p className="-mt-3 text-sm text-muted-foreground">{viewMode === "daily" ? today : monthLabel}</p>

        {/* Stats bar */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.id} className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
              <p className={cn("text-2xl font-bold", col.color)}>{counts[col.id]}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{STAT_LABELS[col.id]}</p>
            </div>
          ))}
        </div>

        {/* Board */}
        <div data-tour="kanban-board" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              col={col}
              tasks={tasks.filter((t) => t.status === col.id)}
              onDragStart={setDraggingId}
              onDrop={handleDrop}
              onAdd={openAdd}
            />
          ))}
        </div>
      </div>

      {/* Add Task dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
            <DialogDescription>Create a manual task and assign it to a client.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Task title *</Label>
              <Input placeholder="e.g. Call client for missing photo ID" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Client name *</Label>
              <Input placeholder="e.g. Arjun Mehta" value={form.clientName} onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Textarea placeholder="Add context or phone number..." value={form.contextNote} onChange={(e) => setForm((f) => ({ ...f, contextNote: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v as TaskPriority }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Column</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as TaskStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="inprogress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Due time</Label>
              <Input placeholder="e.g. Today, 2 PM" value={form.dueTime} onChange={(e) => setForm((f) => ({ ...f, dueTime: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.title.trim() || !form.clientName.trim()}>Add Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProductTour
        open={showHint}
        onClose={dismissHint}
        steps={[
          { target: '[data-tour="kanban-view-toggle"]', title: "Daily / Monthly View", content: "Switch between Daily and Monthly views to manage today's tasks or plan the whole month.", side: "bottom" },
          { target: '[data-tour="kanban-add-task"]', title: "Add Tasks", content: "Create a new task here. Assign it a client, priority, due time, and target column.", side: "bottom" },
          { target: '[data-tour="kanban-board"]', title: "Drag & Drop", content: "Drag task cards between columns (To Do → In Progress → Review → Done) to update their status.", side: "top" },
        ]}
      />
    </PageWrapper>
  );
}
