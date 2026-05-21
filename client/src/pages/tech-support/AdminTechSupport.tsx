import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock3, 
  Headset, 
  Loader2, 
  RefreshCw, 
  Info, 
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  ArrowRight
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { clientService } from "@/services/clientService";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SimpleCalendar } from "@/components/ui/simple-calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSocket } from "@/context/socket-context";
import { format, startOfDay, endOfDay, startOfMonth, addMonths } from "date-fns";

function SimplifiedCard({ item, onOpen }: { item: any; onOpen: (item: any) => void }) {
  const priorityColors: any = {
    low: "bg-emerald-100/80 text-emerald-700 border-emerald-200",
    medium: "bg-amber-100/80 text-amber-700 border-amber-200",
    high: "bg-orange-100/80 text-orange-700 border-orange-200",
    urgent: "bg-red-100/80 text-red-700 border-red-200",
    critical: "bg-red-200 text-red-800 border-red-300",
  };

  return (
    <div 
      className="bg-white/70 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] transition-all duration-300 cursor-pointer group flex flex-col gap-3 hover:-translate-y-1 active:scale-[0.98]"
      onClick={() => onOpen(item)}
    >
      <div className="flex justify-between items-start gap-4">
        <h4 className="text-sm font-bold text-slate-800 line-clamp-2 flex-1 leading-snug group-hover:text-primary transition-colors">
          {item.title || item.reason || item.commonIssue || "Support Request"}
        </h4>
        <Badge variant="outline" className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border shadow-sm ${priorityColors[item.priority] || "bg-gray-100"}`}>
          {item.priority}
        </Badge>
      </div>
      
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200">
            {(item.counsellorNameSnapshot || item.requesterNameSnapshot || "N").charAt(0)}
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] text-slate-700 font-bold leading-none mb-0.5">
              {item.counsellorNameSnapshot || item.requesterNameSnapshot || "Anonymous"}
            </span>
            <span className="text-[9px] text-slate-400 font-medium">
              {format(new Date(item.createdAt), "MMM dd, HH:mm")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px] font-mono bg-slate-50 text-slate-500 px-2 py-0 border-none">
            {item.ticketNo || item.requestNo || `#${item.id}`}
          </Badge>
        </div>
      </div>
    </div>
  );
}

function BoardSection({ title, items, onOpen, icon }: { title: string; items: any[]; onOpen: (item: any) => void; icon: React.ReactNode }) {
  const colorMap: any = {
    "Awaiting Action": "bg-amber-500",
    "Under Treatment": "bg-blue-500",
    "Resolved Tasks": "bg-emerald-500",
  };

  return (
    <div className="flex flex-col gap-4 min-w-[320px] max-w-[450px] flex-1 h-[600px]">
      <div className="flex items-center justify-between px-3">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-6 rounded-full ${colorMap[title] || "bg-slate-400"} shadow-sm`} />
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">{title}</h3>
          <Badge className="bg-slate-900 border-none text-[10px] h-5 px-2 font-black">{items.length}</Badge>
        </div>
        <div className="p-1.5 bg-slate-100 rounded-lg text-slate-400">
          {icon}
        </div>
      </div>
      
      <div className="flex-1 bg-slate-100/40 backdrop-blur-md border border-white/60 rounded-[2.5rem] p-4 shadow-inner overflow-hidden flex flex-col">
        <ScrollArea className="flex-1 pr-4 [&>[data-radix-scroll-area-viewport]]:!block">
          <div className="flex flex-col gap-4 pb-4">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-4 opacity-50">
                 <div className="w-16 h-16 rounded-full border-4 border-dashed border-slate-300 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-slate-300" />
                 </div>
                 <p className="text-xs font-bold uppercase tracking-widest text-center">Section Clear</p>
              </div>
            ) : (
              items.map((item) => (
                <SimplifiedCard key={item.uid} item={item} onOpen={onOpen} />
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

export function AdminTechSupport() {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: startOfMonth(addMonths(new Date(), 1)),
  });
  const [isQueueOpen, setIsQueueOpen] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["tech-support-analytics-overview", dateRange.from?.toISOString(), dateRange.to?.toISOString()],
    queryFn: () => clientService.getTechSupportAnalyticsOverview(
      dateRange.from?.toISOString(),
      dateRange.to?.toISOString()
    ),
  });

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["tech-support-analytics-overview"] });
    };

    socket.on("techSupport:ticketCreated", handleUpdate);
    socket.on("techSupport:ticketMoved", handleUpdate);
    socket.on("techSupport:requestCreated", handleUpdate);
    socket.on("techSupport:requestUpdated", handleUpdate);
    socket.on("techSupport:ticketAssigned", handleUpdate);

    return () => {
      socket.off("techSupport:ticketCreated", handleUpdate);
      socket.off("techSupport:ticketMoved", handleUpdate);
      socket.off("techSupport:requestCreated", handleUpdate);
      socket.off("techSupport:requestUpdated", handleUpdate);
      socket.off("techSupport:ticketAssigned", handleUpdate);
    };
  }, [socket, queryClient]);

  const overview = data?.overview ?? {
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
    avgFirstResponseMinutes: 0,
    avgResolutionMinutes: 0,
  };
  const board = data?.board ?? { pending: [], in_progress: [], resolved: [] };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-border/50">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <LayoutDashboard className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">Tech Support Control Center</h1>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
              Live Monitoring: {format(dateRange.from, "MMM dd")} — {format(dateRange.to, "MMM dd, yyyy")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl px-2 py-1 shadow-sm gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase ml-2">From</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2 font-bold text-xs gap-2">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    {format(dateRange.from, "PP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 shadow-2xl">
                  <SimpleCalendar 
                    value={dateRange.from} 
                    onChange={(d: any) => setDateRange(prev => ({ ...prev, from: startOfDay(d) }))} 
                  />
                </PopoverContent>
              </Popover>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase">To</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2 font-bold text-xs gap-2">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    {format(dateRange.to, "PP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 shadow-2xl">
                  <SimpleCalendar 
                    value={dateRange.to} 
                    onChange={(d: any) => setDateRange(prev => ({ ...prev, to: endOfDay(d) }))} 
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Button 
            variant="secondary" 
            size="icon" 
            className="h-10 w-10 rounded-xl bg-white border shadow-sm hover:bg-slate-50 transition-all"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <TooltipProvider>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[
            { label: "Total Raised Ticket", value: overview.total, color: "text-slate-800", bg: "bg-white", icon: <Headset className="w-4 h-4" /> },
            { label: "New Tickets", value: overview.pending, color: "text-amber-600", bg: "bg-white", icon: <AlertTriangle className="w-4 h-4" /> },
            { label: "Ongoing Tickets", value: overview.inProgress, color: "text-blue-600", bg: "bg-white", icon: <Clock3 className="w-4 h-4" /> },
            { label: "Resolved Tickets", value: overview.resolved, color: "text-emerald-600", bg: "bg-white", icon: <CheckCircle2 className="w-4 h-4" /> },
            { 
              label: "First Response", 
              value: `${Math.round(overview.avgFirstResponseMinutes)}m`, 
              color: "text-primary", 
              bg: "bg-white", 
              icon: <Clock3 className="w-4 h-4" />,
              info: "Average time between ticket creation and the first action (claim) by a technician."
            },
            { 
              label: "Resolution", 
              value: `${Math.round(overview.avgResolutionMinutes)}m`, 
              color: "text-indigo-600", 
              bg: "bg-white", 
              icon: <CheckCircle2 className="w-4 h-4" />,
              info: "Average total time from creation to final resolution and counsellor approval."
            },
          ].map((card, idx) => (
            <Card key={idx} className={`${card.bg} border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 rounded-lg bg-slate-50 text-slate-500 border border-slate-100">
                    {card.icon}
                  </div>
                  {card.info && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3.5 h-3.5 text-slate-300 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="bg-slate-900 border-none p-3 shadow-xl">
                        <p className="text-[10px] leading-relaxed max-w-[150px]">{card.info}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{card.label}</p>
                <p className={`text-xl font-black mt-0.5 ${card.color}`}>{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </TooltipProvider>

      <Collapsible open={isQueueOpen} onOpenChange={setIsQueueOpen} className="w-full">
        <Card className="border-none shadow-premium bg-white/50 backdrop-blur-md overflow-hidden rounded-3xl">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between px-8 py-5 cursor-pointer hover:bg-slate-50 transition-all group">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
                  <RefreshCw className="w-5 h-5 animate-spin-slow" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800">Live Support Queue</h2>
                  <p className="text-xs text-slate-500 font-medium tracking-tight">Real-time status of all active tickets and requests</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex -space-x-2">
                   <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{board.pending.length} New</Badge>
                   <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{board.in_progress.length} Open</Badge>
                </div>
                {isQueueOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-6 border-t border-slate-100 bg-slate-50/30">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="w-10 h-10 animate-spin text-primary/30" />
                  <p className="text-sm font-bold text-slate-400 animate-pulse uppercase tracking-widest">Syncing with server...</p>
                </div>
              ) : (
                <div className="flex flex-col lg:flex-row gap-6">
                  <BoardSection 
                    title="Awaiting Action" 
                    icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
                    items={board.pending} 
                    onOpen={setSelectedItem} 
                  />
                  <BoardSection 
                    title="Under Treatment" 
                    icon={<Clock3 className="w-4 h-4 text-blue-500" />}
                    items={board.in_progress} 
                    onOpen={setSelectedItem} 
                  />
                  <BoardSection 
                    title="Resolved Tasks" 
                    icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    items={board.resolved} 
                    onOpen={setSelectedItem} 
                  />
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-2xl rounded-3xl p-8 border-none shadow-2xl">
          <DialogHeader className="mb-6">
            <div className="flex items-center justify-between">
              <Badge className="bg-primary/10 text-primary border-none text-[10px] px-3 font-black tracking-widest uppercase">
                {selectedItem?.source} Info
              </Badge>
              <span className="text-xs font-mono text-slate-400">{selectedItem?.ticketNo || selectedItem?.requestNo}</span>
            </div>
            <DialogTitle className="text-2xl font-black mt-4 leading-tight">{selectedItem?.title || selectedItem?.reason || selectedItem?.commonIssue}</DialogTitle>
            <DialogDescription className="text-sm font-medium text-slate-500">Raised by {selectedItem?.counsellorNameSnapshot || selectedItem?.requesterNameSnapshot}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
               <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Description / Reason</h5>
               <p className="text-sm text-slate-700 leading-relaxed font-medium">
                 {selectedItem?.description || selectedItem?.reason || "No detail provided"}
               </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="p-4 rounded-xl border bg-white flex flex-col gap-1">
                 <span className="text-[9px] uppercase font-bold text-slate-400">Created At</span>
                 <span className="text-sm font-bold">{selectedItem?.createdAt && format(new Date(selectedItem.createdAt), "PPP p")}</span>
               </div>
               <div className="p-4 rounded-xl border bg-white flex flex-col gap-1">
                 <span className="text-[9px] uppercase font-bold text-slate-400">Current Status</span>
                 <Badge className="w-fit text-[10px] font-black uppercase">{selectedItem?.status}</Badge>
               </div>
            </div>

            {selectedItem?.assignedToName && (
               <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white font-bold">
                     {selectedItem.assignedToName.charAt(0)}
                   </div>
                   <div>
                     <p className="text-[9px] uppercase font-black text-indigo-400 mb-0.5">Assigned Technician</p>
                     <p className="text-sm font-bold text-indigo-900">{selectedItem.assignedToName}</p>
                   </div>
                 </div>
               </div>
            )}
          </div>

          <div className="flex justify-end mt-8">
            <Button className="rounded-xl px-8 font-bold" onClick={() => setSelectedItem(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
