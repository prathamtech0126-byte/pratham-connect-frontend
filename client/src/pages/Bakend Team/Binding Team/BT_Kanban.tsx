import { TaskKanbanBoard, type Task } from "@/components/kanban/TaskKanbanBoard";

// ── Seed tasks (replace with API) — binding-team flavoured ──────────────────────

const DAILY_TASKS: Task[] = [
  { id: "b1", title: "Verify & bind final document set", type: "auto", clientName: "Hemali Kanjaria", contextNote: "10 docs · Canada Student", priority: "high", dueTime: "Today, 11 AM", status: "todo" },
  { id: "b2", title: "Resolve blocked file — missing affidavit", type: "manual", clientName: "Rahul Mehta", contextNote: "Phone: +91 98765 11223", priority: "high", dueTime: "Today, 12 PM", status: "todo" },
  { id: "b3", title: "Assemble application package", type: "auto", clientName: "Sneha Shah", contextNote: "Awaiting passport & photo", priority: "medium", dueTime: "Today, 2 PM", status: "todo" },
  { id: "b4", title: "Final QC before handoff", type: "manual", clientName: "Priya Nair", contextNote: "All docs approved", priority: "medium", dueTime: "Today, 1 PM", status: "inprogress" },
  { id: "b5", title: "Bind financial section", type: "auto", clientName: "Karan Singh", contextNote: "", priority: "low", dueTime: "Today, 4 PM", status: "inprogress" },
  { id: "b6", title: "Hand off file to application team", type: "manual", clientName: "Vikram Rao", contextNote: "12/12 docs · Canada SDS", priority: "high", dueTime: "Today, 10 AM", status: "review" },
  { id: "b7", title: "Confirm handoff received", type: "manual", clientName: "Anita Desai", contextNote: "", priority: "low", dueTime: "Yesterday", dueOverdue: true, status: "done" },
];

const MONTHLY_TASKS: Task[] = [
  { id: "bm1", title: "Bind & QC student visa files", type: "auto", clientName: "Pooja Rao", contextNote: "USA Student", priority: "high", dueTime: "May 28", status: "todo" },
  { id: "bm2", title: "Clear backlog of blocked files", type: "manual", clientName: "Multiple clients", contextNote: "3 blocked files", priority: "high", dueTime: "May 30", status: "todo" },
  { id: "bm3", title: "Re-bind after document update", type: "auto", clientName: "Meenalben Manishgar", contextNote: "Germany Student", priority: "medium", dueTime: "May 26", status: "todo" },
  { id: "bm4", title: "Hand off Australia work files", type: "manual", clientName: "Sidikaben Vahora", contextNote: "Phone: +91 98712 34560", priority: "high", dueTime: "May 27", status: "inprogress" },
  { id: "bm5", title: "QC spouse visa package", type: "auto", clientName: "Trushaben Patel", contextNote: "UK Spouse", priority: "medium", dueTime: "May 29", status: "inprogress" },
  { id: "bm6", title: "Prepare monthly handoff report", type: "manual", clientName: "Internal", contextNote: "For application team", priority: "medium", dueTime: "May 31", status: "review" },
  { id: "bm7", title: "Archive completed binding files", type: "auto", clientName: "Amit Verma", contextNote: "", priority: "high", dueTime: "May 20", status: "done" },
  { id: "bm8", title: "Update document templates", type: "manual", clientName: "Internal", contextNote: "", priority: "low", dueTime: "May 18", status: "done" },
];

export default function BtKanban() {
  return (
    <TaskKanbanBoard
      boardKey="binding"
      breadcrumbLabel="Binding Team"
      hintKey="bt_kanban"
      seedDaily={DAILY_TASKS}
      seedMonthly={MONTHLY_TASKS}
    />
  );
}
