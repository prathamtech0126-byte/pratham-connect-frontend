import React, { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import { Eye, ImageIcon } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { clientService } from "@/services/clientService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSocket } from "@/context/socket-context";
import { useToast } from "@/hooks/use-toast";
import { Monitor, Smartphone, Laptop, Mouse, CreditCard, HardDrive, Hash, User, Loader2 } from "lucide-react";

type BoardType = "tickets" | "device_requests" | "recharge_requests" | "all";
type ColumnKey = "pending" | "in_progress" | "resolved";

type Ticket = {
  id: number;
  uid: string;
  source?: "ticket" | "request";
  ticketNo?: string;
  requestNo?: string;
  title?: string;
  counsellorNameSnapshot?: string;
  requesterNameSnapshot?: string;
  description?: string;
  reason?: string;
  requestType?: string;
  deviceType?: string;
  deviceRequestType?: string;
  phoneNumber?: string;
  rechargeRequestType?: string;
  amountOrPlan?: string;
  currentRechargeExpiryDate?: string;
  commonIssue?: string;
  priority?: "low" | "medium" | "high" | "urgent" | "critical";
  status: "pending" | "in_progress" | "waiting_for_approval" | "resolved";
  createdAt: string;
  counsellorId?: number;
  requesterId?: number;
  attachments?: Array<{ name: string; url: string; mimeType: string }>;
};

const COLUMN_KEYS = ["pending", "in_progress", "resolved"] as const;

const COLUMN_LABELS: Record<ColumnKey, string> = {
  pending: "Pending",
  in_progress: "Ongoing",
  resolved: "Resolved",
};

const getPriorityClass = (value?: string) => {
  switch (String(value ?? "").toLowerCase()) {
    case "low":
      return "bg-green-50 text-green-700 border-green-200";
    case "medium":
      return "bg-yellow-50 text-yellow-700 border-yellow-200";
    case "high":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "critical":
    case "urgent":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

function SortableTicketCard({
  ticket,
  boardType,
  onOpen,
  onRequestResolve,
}: {
  ticket: Ticket;
  boardType: BoardType;
  onOpen: (ticket: Ticket) => void;
  onRequestResolve?: (ticket: Ticket) => void;
}) {
  const heading =
    ticket.requestType === "recharge_sim_request"
      ? `SIM Recharge Request${ticket.rechargeRequestType
        ? ` (${ticket.rechargeRequestType.replace(/_/g, " ")})`
        : ""
      }`
      : ticket.requestType === "device_request"
        ? `Device Request${ticket.deviceType
          ? ` (${ticket.deviceType.replace(/-/g, " ")})`
          : ""
        }`
        : ticket.title ||
        ticket.commonIssue ||
        ticket.reason ||
        `IT Support Ticket`;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: ticket.uid,
    data: {
      type: "Ticket",
      ticket,
    },
    disabled: ticket.status === "resolved" || ticket.status === "waiting_for_approval",
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // ✅ Prevent click while dragging
  const handleClick = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onOpen(ticket);
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="opacity-30 border-2 border-dashed border-blue-400 bg-blue-50 rounded-lg p-4 min-h-[120px]"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer group relative flex flex-col min-h-[140px] flex-none"
    >
      <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex justify-between items-start mb-3 gap-2">
        <h3 className="font-semibold text-sm text-gray-900 break-words line-clamp-2">
          {heading}
        </h3>
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Image indicator if ticket has photos */}
          {(() => {
            const attachments = (ticket.attachments as any[]) || [];
            const hasImages = attachments.some((a) => a.url && a.mimeType?.startsWith("image/"));
            if (!hasImages) return null;
            return (
              <div className="flex items-center gap-1 text-blue-500" title="Has attached photos">
                <ImageIcon className="w-3.5 h-3.5" />
                <span className="text-[10px] font-medium">{attachments.filter(a => a.mimeType?.startsWith("image/")).length}</span>
              </div>
            );
          })()}
          <Badge
            variant="outline"
            className={`
              uppercase text-[10px] px-2 py-0.5 whitespace-nowrap flex-shrink-0
              ${getPriorityClass(ticket.priority)}
            `}
          >
            {ticket.priority || "medium"}
          </Badge>
        </div>
      </div>

      <div className="space-y-2 text-xs text-gray-500 flex-grow">
        <p className="break-words">
          <span className="font-medium text-gray-700">Name:</span>{" "}
          <span className="text-gray-600">{ticket.counsellorNameSnapshot || ticket.requesterNameSnapshot || "N/A"}</span>
        </p>
        {ticket.requestType === "device_request" && (
          <p className="break-words">
            <span className="font-medium text-gray-700">Device:</span>{" "}
            <span className="text-gray-600">{ticket.deviceType || "-"}</span>
          </p>
        )}
        {ticket.requestType === "recharge_sim_request" && (
          <p className="break-words">
            <span className="font-medium text-gray-700">Phone:</span>{" "}
            <span className="text-gray-600">{ticket.phoneNumber || "-"}</span>
          </p>
        )}
        <p className="break-words line-clamp-3">
          <span className="font-medium text-gray-700">Problem:</span>{" "}
          <span className="text-gray-600">{ticket.commonIssue || ticket.reason || ticket.description || "No details"}</span>
        </p>
        <p className="text-gray-400 text-[10px]">
          <span className="font-medium">Raised:</span>{" "}
          {format(new Date(ticket.createdAt), "dd/MM/yyyy, HH:mm")}
        </p>
      </div>

      {(ticket.status === "in_progress" || ticket.status === "waiting_for_approval") && (
        <div className="mt-3 pt-2 border-t border-gray-100 flex justify-end">
          {ticket.status === "waiting_for_approval" ? (
            <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-[10px]">Waiting for Approval</Badge>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[10px] border-blue-200 text-blue-700 hover:bg-blue-50 z-10"
              onClick={(e) => {
                e.stopPropagation();
                onRequestResolve?.(ticket);
              }}
            >
              Request Resolve
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function Column({ id, tickets, boardType, onOpen, onRequestResolve }: { id: ColumnKey; tickets: Ticket[]; boardType: BoardType; onOpen: (ticket: Ticket) => void; onRequestResolve?: (ticket: Ticket) => void; }) {
  const { setNodeRef } = useSortable({
    id,
    data: {
      type: "Column",
      columnId: id,
    },
  });

  return (
    <div className="flex flex-col flex-1 bg-gray-50/50 rounded-xl border p-4 pt-5 min-w-[300px] h-[calc(100vh-240px)] min-h-[360px] shadow-sm">
      <div className="font-semibold text-gray-700 mb-4 px-1 flex items-center justify-between shrink-0">
        <span>
          {COLUMN_LABELS[id]} ({tickets.length})
        </span>
      </div>

      <div ref={setNodeRef} className="flex flex-col gap-3 flex-1 min-h-[220px] overflow-y-auto pr-2 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <SortableContext items={tickets.map((t) => t.uid)} strategy={verticalListSortingStrategy}>
          {tickets.map((ticket) => (
            <SortableTicketCard key={ticket.uid} ticket={ticket} boardType={boardType} onOpen={onOpen} onRequestResolve={onRequestResolve} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

const emptyColumns = (): Record<ColumnKey, Ticket[]> => ({
  pending: [],
  in_progress: [],
  resolved: [],
});

const toRequestColumnStatus = (status: string): ColumnKey | null => {
  if (status === "pending") return "pending";
  if (status === "in_progress") return "in_progress";
  if (status === "completed") return "resolved";
  return null;
};

export function TechSupportBoard({
  boardType = "tickets",
  reloadToken = 0,
  onLoaded,
  showRealtimeApprovalToast = false,
  externalFromDate,
  externalToDate,
}: {
  boardType?: BoardType;
  reloadToken?: number;
  onLoaded?: () => void;
  showRealtimeApprovalToast?: boolean;
  externalFromDate?: string;
  externalToDate?: string;
}) {
  const { socket } = useSocket();
  const { toast } = useToast();
  const [columns, setColumns] = useState<Record<ColumnKey, Ticket[]>>({
    pending: [],
    in_progress: [],
    resolved: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeModalTicket, setActiveModalTicket] = useState<Ticket | null>(null);
  const [activeDragTicket, setActiveDragTicket] = useState<Ticket | null>(null);
  const [dragStartColumns, setDragStartColumns] = useState<Record<ColumnKey, Ticket[]> | null>(null);
  const [dragStartContainer, setDragStartContainer] = useState<ColumnKey | null>(null);
  const [lastOverColumn, setLastOverColumn] = useState<ColumnKey | null>(null);

  const [assignedDevices, setAssignedDevices] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [showDeviceDetails, setShowDeviceDetails] = useState(false);
  const [isFetchingDevice, setIsFetchingDevice] = useState(false);

  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  // Sync internal state with external props if provided
  useEffect(() => {
    if (externalFromDate) setFromDate(externalFromDate);
    if (externalToDate) setToDate(externalToDate);
  }, [externalFromDate, externalToDate]);

  useEffect(() => {
    fetchBoard(false);
  }, [boardType, reloadToken]);

  // Fetch assigned device when a ticket is opened in modal
  useEffect(() => {
    const userId = activeModalTicket?.counsellorId || activeModalTicket?.requesterId;
    if (userId) {
      loadAssignedDevices(userId);
    } else {
      setAssignedDevices([]);
    }
  }, [activeModalTicket]);

  const loadAssignedDevices = async (userId: number) => {
    try {
      setIsFetchingDevice(true);
      // Fetch all devices and filter by userId to get all assigned devices
      const allDevices = await clientService.getDeviceInventory();
      const userDevices = allDevices.filter((d: any) => d.currentUserId === userId);
      setAssignedDevices(userDevices);
    } catch (err) {
      console.error("Failed to fetch assigned devices", err);
      setAssignedDevices([]);
    } finally {
      setIsFetchingDevice(false);
    }
  };

  useEffect(() => {
    if (!socket) return;
    const refresh = (payload?: { toStatus?: string; status?: string }) => {
      fetchBoard(true);
    };
    socket.on("techSupport:ticketCreated", refresh);
    socket.on("techSupport:ticketAssigned", refresh);
    socket.on("techSupport:ticketMoved", refresh);
    socket.on("techSupport:ticketUpdated", refresh);
    socket.on("techSupport:requestCreated", refresh);
    socket.on("techSupport:requestUpdated", refresh);
    return () => {
      socket.off("techSupport:ticketCreated", refresh);
      socket.off("techSupport:ticketAssigned", refresh);
      socket.off("techSupport:ticketMoved", refresh);
      socket.off("techSupport:ticketUpdated", refresh);
      socket.off("techSupport:requestCreated", refresh);
      socket.off("techSupport:requestUpdated", refresh);
    };
  }, [socket, boardType, showRealtimeApprovalToast]);

  const fetchBoard = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);

      if (boardType === "tickets") {
        const res = await clientService.getTechSupportBoard();

        setColumns({
          pending:
            res?.pending?.map((row: any) => ({
              ...row,
              uid: `ticket-${row.id}`,
              source: "ticket",
              status: row.status,
            })) || [],
          in_progress:
            res?.in_progress?.map((row: any) => ({
              ...row,
              uid: `ticket-${row.id}`,
              source: "ticket",
              status: row.status,
            })) || [],
          resolved:
            res?.resolved?.map((row: any) => ({
              ...row,
              uid: `ticket-${row.id}`,
              source: "ticket",
              status: row.status,
            })) || [],
        });
      }

      else if (boardType === "all") {
        const [ticketRes, allRequests] = await Promise.all([
          clientService.getTechSupportBoard(),
          clientService.getAllTechSupportRequests(),
        ]);

        // ✅ Normalize ticket status
        const ticketItems = [
          ...(ticketRes?.pending || []),
          ...(ticketRes?.in_progress || []),
          ...(ticketRes?.resolved || []),
        ].map((row: any) => {
          let columnStatus: ColumnKey = "pending";

          if (row.status === "in_progress") columnStatus = "in_progress";
          else if (
            row.status === "resolved" ||
            row.status === "completed"
          )
            columnStatus = "resolved";
          else if (row.status === "waiting_for_approval")
            columnStatus = "in_progress";

          return {
            ...row,
            uid: `ticket-${row.id}`,
            source: "ticket" as const,
            columnStatus,
          };
        });

        // ✅ Normalize request status
        const requestItems = (allRequests || []).map((row: any) => {
          let columnStatus: ColumnKey = "pending";

          if (row.status === "in_progress") columnStatus = "in_progress";
          else if (row.status === "completed") columnStatus = "resolved";
          else if (row.status === "waiting_for_approval")
            columnStatus = "in_progress";

          return {
            ...row,
            uid: `request-${row.id}`,
            source: "request" as const,
            columnStatus,
          };
        });

        const grouped = emptyColumns();

        // ✅ Safe grouping (no crash)
        [...ticketItems, ...requestItems].forEach((row: any) => {
          if (grouped[row.columnStatus as ColumnKey]) {
            grouped[row.columnStatus as ColumnKey].push(row);
          }
        });

        setColumns(grouped);
      }

      else {
        const allRequests = await clientService.getAllTechSupportRequests();

        const filtered = allRequests.filter((r: any) =>
          boardType === "device_requests"
            ? r.requestType === "device_request"
            : r.requestType === "recharge_sim_request"
        );

        const grouped = emptyColumns();

        filtered.forEach((row: any) => {
          let col: ColumnKey = "pending";

          if (row.status === "in_progress") col = "in_progress";
          else if (row.status === "completed") col = "resolved";
          else if (row.status === "waiting_for_approval")
            col = "in_progress";

          if (!grouped[col]) return;

          grouped[col].push({
            ...row,
            uid: `request-${row.id}`,
            source: "request" as const,
            status: row.status,
          });
        });

        setColumns(grouped);
      }
    } catch (error) {
      toast({
        title: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      if (!silent) setIsLoading(false);
      onLoaded?.();
    }
  };
  const handleRequestResolve = async (ticket: Ticket) => {
    try {
      let response: any;
      if (ticket.source === "request") {
        response = await clientService.reviewTechSupportRequest(Number(ticket.id), { status: "waiting_for_approval" });
      } else {
        response = await clientService.updateTechSupportTicketStatus(Number(ticket.id), "waiting_for_approval");
      }
      toast({
        title: "Request sent",
        description: response?.message || "Sent for counselor approval.",
      });
      fetchBoard(true);
    } catch (e) {
      toast({
        title: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setDragStartColumns(structuredClone(columns));
    setDragStartContainer(findContainer(columns, String(active.id)) ?? null);
    setLastOverColumn(null);
    if (active.data.current?.type === "Ticket") {
      setActiveDragTicket(active.data.current.ticket);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveATicket = active.data.current?.type === "Ticket";
    const isOverATicket = over.data.current?.type === "Ticket";
    const isOverAColumn = over.data.current?.type === "Column";

    if (!isActiveATicket) return;

    // Moving ticket to another column dropping over a ticket
    if (isActiveATicket && isOverATicket) {
      setColumns((prev) => {
        const activeContainer = findContainer(prev, activeId as string);
        const overContainer = findContainer(prev, overId as string);
        setLastOverColumn(overContainer ?? null);

        if (!activeContainer || !overContainer || activeContainer === overContainer) {
          return prev;
        }

        const activeItems = [...prev[activeContainer]];
        const overItems = [...prev[overContainer]];
        const activeIndex = activeItems.findIndex((t) => t.uid === activeId);
        const overIndex = overItems.findIndex((t) => t.uid === overId);
        if (activeIndex < 0 || overIndex < 0) return prev;

        const [item] = activeItems.splice(activeIndex, 1);
        item.status = overContainer;
        overItems.splice(overIndex, 0, item);

        return {
          ...prev,
          [activeContainer]: activeItems,
          [overContainer]: overItems,
        };
      });
    }

    // Moving ticket dropping over an empty column
    if (isActiveATicket && isOverAColumn) {
      setColumns((prev) => {
        const activeContainer = findContainer(prev, activeId as string);
        const overContainer = overId as ColumnKey;
        setLastOverColumn(overContainer);

        if (!activeContainer || activeContainer === overContainer) {
          return prev;
        }

        const activeItems = [...prev[activeContainer]];
        const overItems = [...prev[overContainer]];
        const activeIndex = activeItems.findIndex((t) => t.uid === activeId);
        if (activeIndex < 0) return prev;

        const [item] = activeItems.splice(activeIndex, 1);
        item.status = overContainer;
        overItems.push(item);

        return {
          ...prev,
          [activeContainer]: activeItems,
          [overContainer]: overItems,
        };
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragTicket(null);

    if (!over) {
      if (dragStartColumns) setColumns(dragStartColumns);
      setDragStartColumns(null);
      setDragStartContainer(null);
      setLastOverColumn(null);
      return;
    }

    const activeId = active.id;
    const overId = over.id;

    const activeContainer = dragStartContainer || findContainer(columns, activeId as string);
    const overContainer =
      lastOverColumn ||
      (over.data.current?.type === "Column" ? (over.id as ColumnKey) : findContainer(columns, overId as string));

    if (activeContainer && overContainer && activeContainer === overContainer) {
      const items = [...columns[activeContainer]];
      const activeIndex = items.findIndex((t) => t.uid === activeId);
      const overIndex = items.findIndex((t) => t.uid === overId);

      if (activeIndex !== overIndex) {
        setColumns({
          ...columns,
          [activeContainer]: arrayMove(items, activeIndex, overIndex),
        });
      }
      setDragStartColumns(null);
      setDragStartContainer(null);
      setLastOverColumn(null);
    } else if (activeContainer && overContainer && activeContainer !== overContainer) {
      try {
        if (activeDragTicket?.source === "request") {
          const requestStatus = overContainer === "resolved" ? "completed" : overContainer;
          await clientService.reviewTechSupportRequest(Number(activeDragTicket.id), { status: requestStatus });
        } else {
          await clientService.updateTechSupportTicketStatus(Number(activeDragTicket?.id), overContainer);
        }
        toast({
          title: "Status updated",
          description: `Ticket moved to ${COLUMN_LABELS[overContainer]}`,
        });
      } catch (error) {
        toast({
          title: "Failed to move ticket",
          variant: "destructive",
        });
        if (dragStartColumns) setColumns(dragStartColumns);
      } finally {
        setDragStartColumns(null);
        setDragStartContainer(null);
        setLastOverColumn(null);
        fetchBoard(true);
      }
    } else {
      setDragStartColumns(null);
      setDragStartContainer(null);
      setLastOverColumn(null);
    }
  };

  const findContainer = (columnsData: Record<ColumnKey, Ticket[]>, id: string) => {
    if (id in columnsData) {
      return id as ColumnKey;
    }
    return (Object.keys(columnsData) as ColumnKey[]).find((key) =>
      columnsData[key].find((item) => item.uid === id),
    );
  };


  const filteredColumns = useMemo(() => {
    const from = fromDate ? new Date(fromDate).getTime() : null;
    const to = toDate ? new Date(toDate).getTime() : null;

    const filterTickets = (tickets: Ticket[], isPending: boolean) => {
      if (isPending) return tickets;
      if (!from && !to) return tickets;

      return tickets.filter(t => {
        const time = new Date(t.createdAt).getTime();
        let valid = true;
        if (from && time < from) valid = false;
        if (to && time > to + 86400000) valid = false;
        return valid;
      });
    };

    return {
      pending: filterTickets(columns.pending, true),
      in_progress: filterTickets(columns.in_progress, false),
      resolved: filterTickets(columns.resolved, false),
    };
  }, [columns, fromDate, toDate]);

  const summary = [
    { label: "Pending", count: filteredColumns.pending.length, description: "New issues waiting", style: "border-amber-200 bg-amber-100 text-amber-900" },
    { label: "Ongoing", count: filteredColumns.in_progress.length, description: "Work in progress", style: "border-sky-200 bg-sky-100 text-sky-900" },
    { label: "Resolved", count: filteredColumns.resolved.length, description: "Completed issues", style: "border-emerald-200 bg-emerald-100 text-emerald-900" },
  ];

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading board...</div>;
  }

  return (
    <div className="space-y-6 overflow-x-auto px-2">
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm min-w-[980px]">
        <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <p className="text-base font-semibold text-slate-900">All Support Board</p>
            <p className="text-sm text-slate-500 mt-1">Unified ticket and request workflow.</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {!externalFromDate && (
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border shadow-sm">
                <div className="flex flex-col">
                  <label className="text-[10px] text-gray-500 font-semibold uppercase">From</label>
                  <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="text-xs bg-transparent border-none outline-none cursor-pointer text-gray-700" />
                </div>
                <div className="w-[1px] h-8 bg-gray-200 mx-1"></div>
                <div className="flex flex-col">
                  <label className="text-[10px] text-gray-500 font-semibold uppercase">To</label>
                  <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="text-xs bg-transparent border-none outline-none cursor-pointer text-gray-700" />
                </div>
                {(fromDate || toDate) && (
                  <Button variant="ghost" size="sm" className="h-6 px-2 ml-1 text-[10px] text-red-500 hover:text-red-700 transition-colors" onClick={() => { setFromDate(""); setToDate(""); }}>Clear</Button>
                )}
              </div>
            )}

            <div className="flex gap-3">
              {summary.map((item) => (
                <div key={item.label} className={`rounded-2xl border px-3 py-1.5 sm:px-4 sm:py-2 shadow-sm flex items-center justify-between gap-3 min-w-[120px] ${item.style}`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">{item.label}</span>
                  <span className="text-lg sm:text-xl font-black">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex items-start gap-6 overflow-x-auto pb-4 min-h-[420px]">
            {COLUMN_KEYS.map((colKey) => (
              <Column key={colKey} id={colKey} tickets={filteredColumns[colKey]} boardType={boardType} onOpen={setActiveModalTicket} onRequestResolve={handleRequestResolve} />
            ))}
          </div>

          <DragOverlay>
            {activeDragTicket ? (
              <div className="shadow-xl">
                <SortableTicketCard ticket={activeDragTicket} boardType={boardType} onOpen={() => { }} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <Dialog open={Boolean(activeModalTicket)} onOpenChange={(open) => !open && setActiveModalTicket(null)}>
        <DialogContent className="max-w-2xl">
          {activeModalTicket ? (
            <>
              <DialogHeader>
                <DialogTitle>{activeModalTicket.requestType === "recharge_sim_request" ? "SIM Recharge Request" : activeModalTicket.requestType === "device_request" ? "Device Request" : "Support Ticket"}</DialogTitle>
                <DialogDescription>
                  {activeModalTicket.requestType === "recharge_sim_request" ? "Review details for the recharge / SIM request." : activeModalTicket.requestType === "device_request" ? "Review details for the device request." : "Review details for the support ticket."}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 mt-4 space-y-3 text-sm text-slate-700">
                  <p className="text-slate-500 font-mono text-xs">{activeModalTicket.ticketNo || activeModalTicket.requestNo}</p>
                  <div className="pt-2 border-t border-slate-200">
                    <p className="mb-2"><span className="font-semibold text-slate-900">Name:</span> <span className="text-slate-600">{activeModalTicket.counsellorNameSnapshot || activeModalTicket.requesterNameSnapshot || "N/A"}</span></p>
                    {activeModalTicket.source === "ticket" && (
                      <>
                        <p className="mb-2"><span className="font-semibold">Device:</span> <span className="text-slate-600">{activeModalTicket.deviceType || "-"}</span></p>
                        <p className="mb-2"><span className="font-semibold">Issue:</span> <span className="text-slate-600">{activeModalTicket.commonIssue || activeModalTicket.title || "-"}</span></p>
                        <div className="mb-2">
                          <span className="font-semibold block mb-1">Description:</span> 
                          <p className="text-slate-600 bg-slate-50 p-3 rounded border border-slate-200 whitespace-pre-wrap break-words text-sm">{activeModalTicket.description || "-"}</p>
                        </div>
                      </>
                    )}
                    {activeModalTicket.source === "request" && activeModalTicket.requestType === "device_request" && (
                      <>
                        <p className="mb-2"><span className="font-semibold">Device:</span> <span className="text-slate-600">{activeModalTicket.deviceType || "-"}</span></p>
                        <p className="mb-2"><span className="font-semibold">Request Type:</span> <span className="text-slate-600">{activeModalTicket.deviceRequestType || "-"}</span></p>
                        <p className="mb-2"><span className="font-semibold">Reason:</span> <span className="text-slate-600">{activeModalTicket.reason || "-"}</span></p>
                      </>
                    )}
                    {activeModalTicket.source === "request" && activeModalTicket.requestType === "recharge_sim_request" && (
                      <>
                        <p className="mb-2"><span className="font-semibold">Phone:</span> <span className="text-slate-600">{activeModalTicket.phoneNumber || "-"}</span></p>
                        <p className="mb-2"><span className="font-semibold">Recharge Type:</span> <span className="text-slate-600">{activeModalTicket.rechargeRequestType?.replace(/_/g, " ") || "-"}</span></p>
                        <p className="mb-2"><span className="font-semibold">Expiry Date:</span> <span className="text-slate-600">{activeModalTicket.currentRechargeExpiryDate || "-"}</span></p>
                        <p className="mb-2"><span className="font-semibold">Plan / Amount:</span> <span className="text-slate-600">{activeModalTicket.amountOrPlan || "-"}</span></p>
                        <p className="mb-2"><span className="font-semibold">Reason:</span> <span className="text-slate-600">{activeModalTicket.reason || "-"}</span></p>
                      </>
                    )}
                    <p className="mb-2"><span className="font-semibold">Priority:</span> <Badge className="ml-2" variant="outline">{activeModalTicket.priority || "medium"}</Badge></p>
                    <p className="mb-2"><span className="font-semibold">Status:</span> <Badge className="ml-2" variant="secondary">{activeModalTicket.status.replace(/_/g, " ")}</Badge></p>
                    <p className="text-xs text-slate-500"><span className="font-semibold">Created:</span> {format(new Date(activeModalTicket.createdAt), "dd/MM/yyyy, HH:mm:ss")}</p>
                  </div>

                  {/* Ticket Images */}
                  {(() => {
                    const attachments = (activeModalTicket.attachments as any[]) || [];
                    const images = attachments.filter((a) => a.url && a.mimeType?.startsWith("image/"));
                    if (images.length === 0) return null;
                    return (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                          Attached Photos ({images.length}/2)
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {images.map((img, idx) => (
                            <Button
                              key={idx}
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(img.url, "_blank")}
                              className="text-xs gap-1 hover:bg-blue-50"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View Image {idx + 1}
                            </Button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="md:col-span-1 space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assigned Equipment</h4>
                  {isFetchingDevice ? (
                    <div className="p-4 rounded-xl border border-dashed animate-pulse bg-slate-50 text-center">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2 text-slate-400" />
                      <p className="text-[10px] text-slate-500">Scanning inventory...</p>
                    </div>
                  ) : assignedDevices.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {assignedDevices.map((device) => (
                        <div
                          key={device.id}
                          onClick={() => {
                            setSelectedDevice(device);
                            setShowDeviceDetails(true);
                          }}
                          className="group cursor-pointer p-3 rounded-lg border border-blue-100 bg-blue-50/30 hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-slate-900">{device.prathamProductCode || "N/A"}</p>
                              <p className="text-[10px] text-slate-500 capitalize">{device.deviceType}</p>
                            </div>
                            🔗
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 text-center">
                      <p className="text-[10px] text-slate-500">No device currently assigned to this user.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button variant="outline" onClick={() => setActiveModalTicket(null)}>
                  Close
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Device Details Dialog */}
      <Dialog open={showDeviceDetails} onOpenChange={setShowDeviceDetails}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                {selectedDevice?.deviceType === "mobile" ? <Smartphone className="h-5 w-5" /> :
                  selectedDevice?.deviceType === "laptop" ? <Laptop className="h-5 w-5" /> :
                    selectedDevice?.deviceType === "monitor" ? <Monitor className="h-5 w-5" /> :
                      <HardDrive className="h-5 w-5" />}
              </div>
              Device Information
            </DialogTitle>
          </DialogHeader>

          {selectedDevice && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Pratham ID</p>
                  <p className="text-sm font-semibold">{selectedDevice.prathamProductCode || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Type</p>
                  <Badge variant="outline" className="capitalize">{selectedDevice.deviceType}</Badge>
                </div>
              </div>

              <div className="space-y-3 py-3 border-t border-b border-slate-100">
                <div className="flex items-center gap-2 text-sm">
                  <Laptop className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-500 w-24">Name:</span>
                  <span className="font-medium">{selectedDevice.deviceName || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Hash className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-500 w-24">Serial No:</span>
                  <span className="font-medium font-mono">{selectedDevice.serialNumber || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <HardDrive className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-500 w-24">Hardware:</span>
                  <span className="font-medium">{selectedDevice.hardwareDetail || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-500 w-24">Vendor:</span>
                  <span className="font-medium">{selectedDevice.vendorName || "N/A"}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Assignment Status</p>
                  <p className="text-xs text-slate-600 mt-0.5">Assigned to {activeModalTicket?.counsellorNameSnapshot || activeModalTicket?.requesterNameSnapshot}</p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">Active</Badge>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button onClick={() => setShowDeviceDetails(false)}>
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

