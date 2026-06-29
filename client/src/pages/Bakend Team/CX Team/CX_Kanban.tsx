import { TaskKanbanBoard, type Task } from "@/components/kanban/TaskKanbanBoard";

// ── Seed tasks (replace with API) ───────────────────────────────────────────────

const DAILY_TASKS: Task[] = [
  { id: "t1", title: "Check passport & DOB on application form", type: "auto", clientName: "Arjun Mehta", contextNote: "Document uploaded 2h ago", priority: "high", dueTime: "Today, 11 AM", status: "todo" },
  { id: "t2", title: "Review IELTS certificate", type: "auto", clientName: "Priya Sharma", contextNote: "Submitted for student visa", priority: "high", dueTime: "Today, 12 PM", status: "todo" },
  { id: "t3", title: "Verify bank statement — 6 months", type: "auto", clientName: "Rohan Patel", contextNote: "", priority: "medium", dueTime: "Today, 2 PM", status: "todo" },
  { id: "t4", title: "Call client for missing photo ID", type: "manual", clientName: "Anita Desai", contextNote: "Phone: +91 98765 43210", priority: "medium", dueTime: "Today, 1 PM", status: "inprogress" },
  { id: "t5", title: "Cross-check visa form data", type: "auto", clientName: "Suresh Kumar", contextNote: "", priority: "low", dueTime: "Today, 4 PM", status: "inprogress" },
  { id: "t6", title: "Confirm biometrics appointment", type: "manual", clientName: "Neha Joshi", contextNote: "Appointment booked for tomorrow", priority: "high", dueTime: "Today, 10 AM", status: "review" },
  { id: "t7", title: "Collect signed declaration form", type: "manual", clientName: "Vikram Singh", contextNote: "", priority: "low", dueTime: "Yesterday", dueOverdue: true, status: "done" },
];

const MONTHLY_TASKS: Task[] = [
  { id: "m1", title: "Complete documentation checklist", type: "auto", clientName: "Arjun Mehta", contextNote: "Student visa — Canada", priority: "high", dueTime: "May 28", status: "todo" },
  { id: "m2", title: "Follow up on pending PCC", type: "manual", clientName: "Sidikaben Vahora", contextNote: "PCC applied on May 10", priority: "medium", dueTime: "May 30", status: "todo" },
  { id: "m3", title: "Verify employer letter authenticity", type: "auto", clientName: "Trushaben Patel", contextNote: "Work visa — Australia", priority: "high", dueTime: "May 26", status: "todo" },
  { id: "m4", title: "Schedule visa appointment", type: "manual", clientName: "Meenalben Manishgar", contextNote: "Phone: +91 98712 34560", priority: "high", dueTime: "May 27", status: "inprogress" },
  { id: "m5", title: "Review medical certificate", type: "auto", clientName: "Talat Jahan", contextNote: "Scanned on May 22", priority: "medium", dueTime: "May 29", status: "inprogress" },
  { id: "m6", title: "Send pre-departure checklist", type: "manual", clientName: "Pooja Rao", contextNote: "Visa approved — departure Jun 5", priority: "medium", dueTime: "May 31", status: "review" },
  { id: "m7", title: "Submit application to embassy", type: "auto", clientName: "Amit Verma", contextNote: "", priority: "high", dueTime: "May 20", status: "done" },
  { id: "m8", title: "Collect biometrics confirmation", type: "manual", clientName: "Riya Shah", contextNote: "", priority: "low", dueTime: "May 18", status: "done" },
];

export default function CxKanban() {
  return (
    <TaskKanbanBoard
      boardKey="cx"
      breadcrumbLabel="CX Team"
      hintKey="cx_kanban"
      seedDaily={DAILY_TASKS}
      seedMonthly={MONTHLY_TASKS}
    />
  );
}
