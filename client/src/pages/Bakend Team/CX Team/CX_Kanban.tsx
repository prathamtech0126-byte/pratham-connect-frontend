import { useState } from "react";
import { PageWrapper } from "@/layout/PageWrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Calendar, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageHint } from "@/hooks/usePageHint";
import { ProductTour } from "@/components/ProductTour";

// ── Types ──────────────────────────────────────────────────────────────────────

type ViewMode     = "daily" | "monthly";
type TaskStatus   = "todo" | "inprogress" | "review" | "done";
type TaskPriority = "high" | "medium" | "low";
type TaskType     = "auto" | "manual";

interface Task {
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

// ── Mock data ──────────────────────────────────────────────────────────────────

const DAILY_TASKS: Task[] = [
  {
    id: "t1", title: "Check passport & DOB on application form",
    type: "auto", clientName: "Arjun Mehta",
    contextNote: "Document uploaded 2h ago",
    priority: "high", dueTime: "Today, 11 AM", status: "todo",
  },
  {
    id: "t2", title: "Review IELTS certificate",
    type: "auto", clientName: "Priya Sharma",
    contextNote: "Submitted for student visa",
    priority: "high", dueTime: "Today, 12 PM", status: "todo",
  },
  {
    id: "t3", title: "Verify bank statement — 6 months",
    type: "auto", clientName: "Rohan Patel",
    contextNote: "", priority: "medium", dueTime: "Today, 2 PM", status: "todo",
  },
  {
    id: "t4", title: "Call client for missing photo ID",
    type: "manual", clientName: "Anita Desai",
    contextNote: "Phone: +91 98765 43210",
    priority: "medium", dueTime: "Today, 1 PM", status: "inprogress",
  },
  {
    id: "t5", title: "Cross-check visa form data",
    type: "auto", clientName: "Suresh Kumar",
    contextNote: "", priority: "low", dueTime: "Today, 4 PM", status: "inprogress",
  },
  {
    id: "t6", title: "Confirm biometrics appointment",
    type: "manual", clientName: "Neha Joshi",
    contextNote: "Appointment booked for tomorrow",
    priority: "high", dueTime: "Today, 10 AM", status: "review",
  },
  {
    id: "t7", title: "Collect signed declaration form",
    type: "manual", clientName: "Vikram Singh",
    contextNote: "", priority: "low", dueTime: "Yesterday",
    dueOverdue: true, status: "done",
  },
];

const MONTHLY_TASKS: Task[] = [
  {
    id: "m1", title: "Complete documentation checklist",
    type: "auto", clientName: "Arjun Mehta",
    contextNote: "Student visa — Canada",
    priority: "high", dueTime: "May 28", status: "todo",
  },
  {
    id: "m2", title: "Follow up on pending PCC",
    type: "manual", clientName: "Sidikaben Vahora",
    contextNote: "PCC applied on May 10",
    priority: "medium", dueTime: "May 30", status: "todo",
  },
  {
    id: "m3", title: "Verify employer letter authenticity",
    type: "auto", clientName: "Trushaben Patel",
    contextNote: "Work visa — Australia",
    priority: "high", dueTime: "May 26", status: "todo",
  },
  {
    id: "m4", title: "Schedule visa appointment",
    type: "manual", clientName: "Meenalben Manishgar",
    contextNote: "Phone: +91 98712 34560",
    priority: "high", dueTime: "May 27", status: "inprogress",
  },
  {
    id: "m5", title: "Review medical certificate",
    type: "auto", clientName: "Talat Jahan",
    contextNote: "Scanned on May 22",
    priority: "medium", dueTime: "May 29", status: "inprogress",
  },
  {
    id: "m6", title: "Send pre-departure checklist",
    type: "manual", clientName: "Pooja Rao",
    contextNote: "Visa approved — departure Jun 5",
    priority: "medium", dueTime: "May 31", status: "review",
  },
  {
    id: "m7", title: "Submit application to embassy",
    type: "auto", clientName: "Amit Verma",
    contextNote: "", priority: "high", dueTime: "May 20",
    status: "done",
  },
  {
    id: "m8", title: "Collect biometrics confirmation",
    type: "manual", clientName: "Riya Shah",
    contextNote: "", priority: "low", dueTime: "May 18",
    status: "done",
  },
];

// ── Config ─────────────────────────────────────────────────────────────────────

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: "todo",       label: "TO DO",       color: "text-blue-500"   },
  { id: "inprogress", label: "IN PROGRESS", color: "text-orange-500" },
  { id: "review",     label: "REVIEW",      color: "text-purple-500" },
  { id: "done",       label: "DONE",        color: "text-green-500"  },
];

const STAT_LABELS: Record<TaskStatus, string> = {
  todo: "To do", inprogress: "In progress", review: "Review", done: "Done",
};

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  high:   "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  medium: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
  low:    "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
};

// ── Task Card ──────────────────────────────────────────────────────────────────

function TaskCard({ task, onDragStart }: { task: Task; onDragStart: (id: string) => void }) {
  const hasPhone = task.contextNote.startsWith("Phone:");

  return (
    <div
      draggable
      onDragStart={() => onDragStart(task.id)}
      className="bg-card border border-border rounded-xl p-4 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all select-none"
    >
      {/* Title + type badge */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <p className="text-sm font-semibold text-foreground leading-snug flex-1">
          {task.title}
        </p>
        <span className={cn(
          "flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap",
          task.type === "auto"
            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
            : "bg-muted text-muted-foreground border border-border"
        )}>
          {task.type === "auto" ? "Auto" : "Manual"}
        </span>
      </div>

      {/* Client name */}
      <div className="flex items-center gap-1.5 mb-1">
        <span className="h-3.5 w-3.5 rounded border border-border inline-block flex-shrink-0" />
        <span className="text-xs text-muted-foreground">{task.clientName}</span>
      </div>

      {/* Context note */}
      {task.contextNote && (
        <p className="text-xs text-muted-foreground mt-1 mb-2 leading-relaxed">
          {hasPhone ? (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3 flex-shrink-0" />
              {task.contextNote}
            </span>
          ) : task.contextNote}
        </p>
      )}

      {/* Priority + due */}
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <span className={cn(
          "text-xs font-medium px-2 py-0.5 rounded-full capitalize",
          PRIORITY_STYLE[task.priority]
        )}>
          {task.priority}
        </span>
        <span className={cn(
          "flex items-center gap-1 text-xs",
          task.dueOverdue ? "text-red-500 font-medium" : "text-muted-foreground"
        )}>
          <Calendar className="h-3 w-3" />
          {task.dueTime}
        </span>
      </div>
    </div>
  );
}

// ── Kanban Column ──────────────────────────────────────────────────────────────

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
        "flex flex-col rounded-xl border bg-muted/20 min-h-[420px] transition-colors",
        dragOver ? "border-primary/50 bg-accent/20" : "border-border"
      )}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={() => { onDrop(col.id); setDragOver(false); }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <span className={cn("text-xs font-bold uppercase tracking-widest", col.color)}>
          {col.label}
        </span>
        <span className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground">
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 flex flex-col gap-3 px-3 pb-2 overflow-y-auto">
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} onDragStart={onDragStart} />
        ))}
      </div>

      {/* Add row */}
      <button
        onClick={() => onAdd(col.id)}
        className="mx-3 mb-3 mt-1 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Add
      </button>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  title: "", clientName: "", contextNote: "",
  priority: "medium" as TaskPriority, dueTime: "", status: "todo" as TaskStatus,
};

export default function CxKanban() {
  const { showHint, dismissHint } = usePageHint("cx_kanban");
  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  const [dailyTasks, setDailyTasks]     = useState<Task[]>(DAILY_TASKS);
  const [monthlyTasks, setMonthlyTasks] = useState<Task[]>(MONTHLY_TASKS);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const tasks    = viewMode === "daily" ? dailyTasks : monthlyTasks;
  const setTasks = viewMode === "daily" ? setDailyTasks : setMonthlyTasks;

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const monthLabel = new Date().toLocaleDateString("en-IN", {
    month: "long", year: "numeric",
  });

  function handleDrop(colId: TaskStatus) {
    if (!draggingId) return;
    setTasks(prev => prev.map(t => t.id === draggingId ? { ...t, status: colId } : t));
    setDraggingId(null);
  }

  function openAdd(colId: TaskStatus) {
    setForm({ ...EMPTY_FORM, status: colId });
    setAddOpen(true);
  }

  function handleSave() {
    if (!form.title.trim() || !form.clientName.trim()) return;
    setTasks(prev => [
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
    COLUMNS.map(c => [c.id, tasks.filter(t => t.status === c.id).length])
  ) as Record<TaskStatus, number>;

  return (
    <PageWrapper
      title={viewMode === "daily" ? "My Tasks — Today" : "My Tasks — This Month"}
      breadcrumbs={[{ label: "CX Team", href: "/" }, { label: "Kanban" }]}
      actions={
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div data-tour="kanban-view-toggle" className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setViewMode("daily")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                viewMode === "daily"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              Daily
            </button>
            <button
              onClick={() => setViewMode("monthly")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors border-l border-border",
                viewMode === "monthly"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              Monthly
            </button>
          </div>
          <Button data-tour="kanban-add-task" size="sm" onClick={() => openAdd("todo")}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add task
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Date subtitle */}
        <p className="text-sm text-muted-foreground -mt-3">
          {viewMode === "daily" ? today : monthLabel}
        </p>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {COLUMNS.map(col => (
            <div
              key={col.id}
              className="bg-card border border-border rounded-xl px-5 py-4 shadow-sm"
            >
              <p className={cn("text-2xl font-bold", col.color)}>{counts[col.id]}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{STAT_LABELS[col.id]}</p>
            </div>
          ))}
        </div>

        {/* Kanban board */}
        <div data-tour="kanban-board" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUMNS.map(col => (
            <KanbanColumn
              key={col.id}
              col={col}
              tasks={tasks.filter(t => t.status === col.id)}
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
            <DialogDescription>
              Create a manual task and assign it to a client.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Task title *</Label>
              <Input
                placeholder="e.g. Call client for missing photo ID"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Client name *</Label>
              <Input
                placeholder="e.g. Arjun Mehta"
                value={form.clientName}
                onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Note</Label>
              <Textarea
                placeholder="Add context or phone number..."
                value={form.contextNote}
                onChange={e => setForm(f => ({ ...f, contextNote: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={v => setForm(f => ({ ...f, priority: v as TaskPriority }))}
                >
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
                <Select
                  value={form.status}
                  onValueChange={v => setForm(f => ({ ...f, status: v as TaskStatus }))}
                >
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
              <Input
                placeholder="e.g. Today, 2 PM"
                value={form.dueTime}
                onChange={e => setForm(f => ({ ...f, dueTime: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={!form.title.trim() || !form.clientName.trim()}
            >
              Add Task
            </Button>
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
