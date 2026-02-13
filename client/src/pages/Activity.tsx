import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DataTable } from "@/components/table/DataTable";
import { TableToolbar } from "@/components/table/TableToolbar";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  UserPlus,
  CreditCard,
  FileText,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  LogIn,
  LogOut,
  Loader2,
  Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { clientService } from "@/services/clientService";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { getProductDisplayName, PRODUCT_DISPLAY_NAMES } from "@/constants/productDisplayNames";

interface ChangeDetail {
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

interface ActivityLogItem {
  id: string;
  type: "create" | "payment" | "product" | "status_change" | "upload" | "update" | "login" | "logout";
  title: string;
  description: string;
  timestamp: string;
  changes?: ChangeDetail[];
  user: {
    name: string;
    role: string;
    avatar: string;
  };
  clientName?: string | null;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
  /** Raw from API: for modal Old/New value table when no changes extracted */
  rawOldValue?: any;
  rawNewValue?: any;
  action?: string;
}

// Format activity text: Rupee instead of Dollar, null → Not set, backend product names → friendly names
const formatActivityDescription = (text: string | null | undefined): string => {
  if (text == null || text === "") return "";
  let out = text
    .replace(/\$/g, "₹")
    .replace(/\$null\b/g, "Not set")
    .replace(/\bnull\b/g, "Not set");
  Object.entries(PRODUCT_DISPLAY_NAMES).forEach(([key, label]) => {
    out = out.replace(new RegExp(key, "g"), label);
  });
  return out;
};

// Map API action to component type: any UPDATE action shows as "update"; adds show as payment/product
const mapActionToType = (action: string): ActivityLogItem["type"] => {
  switch (action) {
    case "LOGIN":
      return "login";
    case "LOGOUT":
      return "logout";
    case "CREATE":
      return "create";
    case "UPDATE":
    case "PAYMENT_UPDATED":
    case "PRODUCT_UPDATED":
      return "update";
    case "PAYMENT_ADDED":
      return "payment";
    case "PRODUCT_ADDED":
      return "product";
    default:
      return "update";
  }
};

// Extract changes from oldValue and newValue
const extractChanges = (oldValue: any, newValue: any): ChangeDetail[] => {
  if (!oldValue && !newValue) return [];

  const changes: ChangeDetail[] = [];

  try {
    // Parse if strings, otherwise use as-is
    let old: any = oldValue;
    let newVal: any = newValue;

    if (typeof oldValue === 'string' && oldValue.trim().startsWith('{')) {
      try {
        old = JSON.parse(oldValue);
      } catch {
        old = oldValue;
      }
    }

    if (typeof newValue === 'string' && newValue.trim().startsWith('{')) {
      try {
        newVal = JSON.parse(newValue);
      } catch {
        newVal = newValue;
      }
    }

    // If both are objects, compare keys
    if (old && typeof old === 'object' && newVal && typeof newVal === 'object' && !Array.isArray(old) && !Array.isArray(newVal)) {
      const allKeys = new Set([...Object.keys(old || {}), ...Object.keys(newVal || {})]);

      allKeys.forEach(key => {
        const oldVal = old?.[key];
        const newValItem = newVal?.[key];

        // Skip if values are the same
        if (JSON.stringify(oldVal) === JSON.stringify(newValItem)) return;

        // Format field name nicely
        const fieldName = key
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, str => str.toUpperCase())
          .trim();

        const formatChangeVal = (val: any, k: string) => {
          if (val === null || val === undefined) return null;
          if (k === "productName") return getProductDisplayName(String(val));
          return String(val);
        };

        changes.push({
          field: fieldName,
          oldValue: formatChangeVal(oldVal, key),
          newValue: formatChangeVal(newValItem, key),
        });
      });
    } else if (oldValue !== newValue) {
      // If not objects, just show the change
      changes.push({
        field: 'Value',
        oldValue: oldValue !== null && oldValue !== undefined ? String(oldValue) : null,
        newValue: newValue !== null && newValue !== undefined ? String(newValue) : null,
      });
    }
  } catch (error) {
    console.error('Error extracting changes:', error);
  }

  return changes;
};

// Keys we always show for product/payment old-new table (so null/empty still show as "Not set")
const PRODUCT_PAYMENT_DISPLAY_KEYS = ["productName", "amount", "invoiceNo", "paymentDate", "remarks", "stage", "totalPayment"];

// Build Old/New value rows from raw API oldValue/newValue (for product or payment when no diff changes)
const buildOldNewRows = (oldVal: any, newVal: any): ChangeDetail[] => {
  const o = oldVal && typeof oldVal === "object" && !Array.isArray(oldVal) ? oldVal : {};
  const n = newVal && typeof newVal === "object" && !Array.isArray(newVal) ? newVal : {};
  const allKeysFromApi = new Set([...Object.keys(o), ...Object.keys(n)]);
  // Always show standard product/payment fields so the table is never empty; add any extra keys from API
  const keys = new Set([
    ...PRODUCT_PAYMENT_DISPLAY_KEYS,
    ...Array.from(allKeysFromApi),
  ]);
  const skipKeys = new Set(["createdAt", "clientId", "entityId", "entityType", "paymentId", "productPaymentId", "saleTypeId"]);
  const rows: ChangeDetail[] = [];

  const formatVal = (v: any, key: string): string | null => {
    if (v === null || v === undefined || v === "") return null;
    if (key === "amount" || key === "totalPayment") {
      const num = Number(v);
      if (!isNaN(num)) return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
    }
    if (key === "productName") return getProductDisplayName(String(v).trim());
    const s = String(v).trim();
    return s === "" ? null : s;
  };

  const displayVal = (val: string | null, keyPresent: boolean): string => {
    if (val != null && val !== "") return val;
    return keyPresent ? "Not set" : "—";
  };

  keys.forEach((key) => {
    if (skipKeys.has(key)) return;
    const fieldName = key.replace(/([A-Z])/g, " $1").replace(/^./, (str: string) => str.toUpperCase()).trim();
    const oldStr = displayVal(formatVal(o[key], key), key in o);
    const newStr = displayVal(formatVal(n[key], key), key in n);
    rows.push({ field: fieldName, oldValue: oldStr, newValue: newStr });
  });

  return rows.sort((a, b) => a.field.localeCompare(b.field));
};

// Transform API response to ActivityLogItem
const transformActivityLog = (log: any): ActivityLogItem => {
  const actionType = mapActionToType(log.action);
  const changes = extractChanges(log.oldValue, log.newValue);
  const rawDescription = log.description || "";
  const description = formatActivityDescription(rawDescription);

  let title: string;
  if (log.action === "PRODUCT_ADDED" || log.action === "PRODUCT_UPDATED") {
    const rawProductName = log.metadata?.productName || log.newValue?.productName || log.entityType || "";
    const productName = getProductDisplayName(rawProductName, log.productLabel);
    const actionLabel = log.action === "PRODUCT_ADDED" ? "Product added" : "Product updated";
    title = `${actionLabel}: ${productName}`;
    if (log.clientName) title += ` (${log.clientName})`;
  } else if (rawDescription) {
    title = formatActivityDescription(rawDescription);
  } else {
    const performerName = log.performerName || "Unknown";
    const actionLower = log.action.toLowerCase().replace(/_/g, " ");
    if (log.clientName) title = `${performerName} ${actionLower} for ${log.clientName}`;
    else if (log.action === "LOGIN") title = `${performerName} logged in`;
    else if (log.action === "LOGOUT") title = `${performerName} logged out`;
    else if (log.entityType) title = `${performerName} ${actionLower} ${log.entityType}`;
    else title = `${performerName} ${actionLower}`;
  }

  return {
    id: String(log.logId),
    type: actionType,
    title,
    description,
    timestamp: log.createdAt,
    changes: changes.length > 0 ? changes : undefined,
    user: {
      name: log.performerName || "Unknown",
      role: log.performerRole || "unknown",
      avatar: "",
    },
    clientName: log.clientName,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    metadata: log.metadata,
    rawOldValue: log.oldValue ?? log.old_value,
    rawNewValue: log.newValue ?? log.new_value,
    action: log.action,
  };
};

export default function Activity() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedActivity, setSelectedActivity] = useState<ActivityLogItem | null>(null);
  const limit = 50;

  // Build filters for API
  const apiFilters = useMemo(() => {
    const filters: any = {};
    if (actionFilter !== "all") {
      filters.action = actionFilter;
    }
    if (roleFilter !== "all") {
      // Note: This would need to be mapped to performer IDs in a real implementation
      // For now, we'll filter client-side
    }
    return filters;
  }, [actionFilter, roleFilter]);

  // Fetch activity logs
  const { data, isLoading, error } = useQuery({
    queryKey: ["activity-logs", page, limit, apiFilters],
    queryFn: () => clientService.getActivityLogs(page, limit, apiFilters),
    staleTime: 1000 * 30, // 30 seconds
  });

  const activities: ActivityLogItem[] = useMemo(() => {
    if (!data?.data) return [];
    return data.data.map(transformActivityLog);
  }, [data]);

  // Client-side filtering for search and role
  const filteredActivities = useMemo(() => {
    return activities.filter(item => {
      const matchesSearch =
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase()) ||
        item.user.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.clientName && item.clientName.toLowerCase().includes(search.toLowerCase()));

      const matchesType = typeFilter === "all" || item.type === typeFilter;
      const matchesRole = roleFilter === "all" || item.user.role === roleFilter;

      return matchesSearch && matchesType && matchesRole;
    });
  }, [activities, search, typeFilter, roleFilter]);

  const uniqueRoles = useMemo(() => {
    return Array.from(new Set(activities.map(a => a.user.role))).sort();
  }, [activities]);

  const handleClearFilters = () => {
    setTypeFilter("all");
    setRoleFilter("all");
    setActionFilter("all");
    setSearch("");
  };

  const isFilterActive = typeFilter !== "all" || roleFilter !== "all" || actionFilter !== "all" || search !== "";

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "create": return <UserPlus className="h-4 w-4 text-blue-500" />;
      case "payment": return <CreditCard className="h-4 w-4 text-green-500" />;
      case "product": return <Package className="h-4 w-4 text-teal-500" />;
      case "status_change": return <CheckCircle2 className="h-4 w-4 text-orange-500" />;
      case "upload": return <Upload className="h-4 w-4 text-purple-500" />;
      case "update": return <RefreshCw className="h-4 w-4 text-indigo-500" />;
      case "login": return <LogIn className="h-4 w-4 text-emerald-500" />;
      case "logout": return <LogOut className="h-4 w-4 text-gray-500" />;
      default: return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "create": return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">New Entry</Badge>;
      case "payment": return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Payment</Badge>;
      case "product": return <Badge variant="outline" className="text-teal-600 border-teal-200 bg-teal-50">Product</Badge>;
      case "status_change": return <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">Status</Badge>;
      case "upload": return <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50">Upload</Badge>;
      case "update": return <Badge variant="outline" className="text-indigo-600 border-indigo-200 bg-indigo-50">Update</Badge>;
      case "login": return <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">Login</Badge>;
      case "logout": return <Badge variant="outline" className="text-gray-600 border-gray-200 bg-gray-50">Logout</Badge>;
      default: return <Badge variant="outline">Activity</Badge>;
    }
  };

  const columns = [
    {
      header: "User",
      cell: (item: ActivityLogItem) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={item.user.avatar} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {item.user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{item.user.name}</span>
            <span className="text-xs text-muted-foreground capitalize">{item.user.role.replace('_', ' ')}</span>
          </div>
        </div>
      ),
      className: "w-[250px]"
    },
    {
      header: "Type",
      cell: (item: ActivityLogItem) => (
        <div className="flex items-center gap-2">
          {getTypeIcon(item.type)}
          {getTypeBadge(item.type)}
        </div>
      ),
      className: "w-[150px]"
    },
    {
      header: "Activity",
      cell: (item: ActivityLogItem) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{item.title}</span>
          <span className="text-xs text-muted-foreground">{item.description}</span>
          {item.clientName && (
            <span className="text-xs text-blue-600 mt-1">Client: {item.clientName}</span>
          )}
        </div>
      )
    },
    {
      header: "Date & Time",
      cell: (item: ActivityLogItem) => (
        <div className="flex flex-col">
          <span className="text-sm">{format(new Date(item.timestamp), "MMM d, yyyy")}</span>
          <span className="text-xs text-muted-foreground">{format(new Date(item.timestamp), "h:mm a")}</span>
        </div>
      ),
      className: "w-[150px] text-right"
    }
  ];

  const pagination = data?.pagination;

  return (
    <PageWrapper title="Activity Log">
      {/* <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">System Activity</h2>
        <p className="text-muted-foreground">
          View recent actions and updates across the system.
        </p>
      </div> */}

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-subheader">Activity History</CardTitle>
          <CardDescription>
            {isLoading ? (
              "Loading activity logs..."
            ) : pagination ? (
              `Showing ${filteredActivities.length} of ${pagination.total} activities (Page ${pagination.page} of ${pagination.totalPages})`
            ) : (
              `Showing ${filteredActivities.length} recent activities based on your role permissions.`
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <TableToolbar
              searchPlaceholder="Search activity, user, or client..."
              onSearch={setSearch}
              filters={
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[150px] bg-card border-border/50">
                      <SelectValue placeholder="Activity Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="create">New Entry</SelectItem>
                      <SelectItem value="payment">Payment</SelectItem>
                      <SelectItem value="product">Product</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                      <SelectItem value="login">Login</SelectItem>
                      <SelectItem value="logout">Logout</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger className="w-[150px] bg-card border-border/50">
                      <SelectValue placeholder="Action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      <SelectItem value="LOGIN">Login</SelectItem>
                      <SelectItem value="LOGOUT">Logout</SelectItem>
                      <SelectItem value="CREATE">Create</SelectItem>
                      <SelectItem value="UPDATE">Update</SelectItem>
                      <SelectItem value="PAYMENT_ADDED">Payment Added</SelectItem>
                      <SelectItem value="PAYMENT_UPDATED">Payment Updated</SelectItem>
                      <SelectItem value="PRODUCT_ADDED">Product Added</SelectItem>
                      <SelectItem value="PRODUCT_UPDATED">Product Updated</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[150px] bg-card border-border/50">
                      <SelectValue placeholder="User Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      {uniqueRoles.map(role => (
                        <SelectItem key={role} value={role} className="capitalize">
                          {role.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {isFilterActive && (
                    <Button
                      variant="outline"
                      onClick={handleClearFilters}
                      className="bg-card text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                    >
                      Clear All
                      <X className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              }
            />

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading activity logs...</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                <p className="text-destructive font-medium">Failed to load activity logs</p>
                <p className="text-sm text-muted-foreground mt-1">Please try refreshing the page</p>
              </div>
            ) : filteredActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground font-medium">No activities found</p>
                <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              <>
                <DataTable
                  data={filteredActivities}
                  columns={columns}
                  onRowClick={(item) => setSelectedActivity(item)}
                />

                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <div className="text-sm text-muted-foreground">
                      Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                    </div>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={(e) => {
                              e.preventDefault();
                              if (pagination.hasPrev) {
                                setPage(p => Math.max(1, p - 1));
                              }
                            }}
                            className={!pagination.hasPrev ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            href="#"
                          />
                        </PaginationItem>
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                          let pageNum;
                          if (pagination.totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (pagination.page <= 3) {
                            pageNum = i + 1;
                          } else if (pagination.page >= pagination.totalPages - 2) {
                            pageNum = pagination.totalPages - 4 + i;
                          } else {
                            pageNum = pagination.page - 2 + i;
                          }

                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                onClick={(e) => {
                                  e.preventDefault();
                                  setPage(pageNum);
                                }}
                                isActive={pagination.page === pageNum}
                                className="cursor-pointer"
                                href="#"
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        <PaginationItem>
                          <PaginationNext
                            onClick={(e) => {
                              e.preventDefault();
                              if (pagination.hasNext) {
                                setPage(p => Math.min(pagination.totalPages, p + 1));
                              }
                            }}
                            className={!pagination.hasNext ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            href="#"
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}

            <Dialog open={!!selectedActivity} onOpenChange={(open) => !open && setSelectedActivity(null)}>
              <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Activity Details</DialogTitle>
                  <DialogDescription>
                    {selectedActivity?.title}
                  </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                  <div className="flex items-center gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedActivity?.user.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {selectedActivity?.user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{selectedActivity?.user.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {selectedActivity?.user.role.replace('_', ' ')} • {selectedActivity && format(new Date(selectedActivity.timestamp), "MMM d, yyyy h:mm a")}
                      </p>
                      {selectedActivity?.clientName && (
                        <p className="text-xs text-blue-600 mt-1">Client: {selectedActivity.clientName}</p>
                      )}
                    </div>
                  </div>

                  {selectedActivity?.ipAddress && (
                    <div className="mb-4 p-3 bg-muted/20 rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">IP Address:</span> {selectedActivity.ipAddress}
                      </p>
                      {selectedActivity.userAgent && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className="font-medium">User Agent:</span> {selectedActivity.userAgent}
                        </p>
                      )}
                    </div>
                  )}

                  {(() => {
                    const changes = selectedActivity?.changes;
                    const hasChanges = changes && changes.length > 0;
                    const rawOld = selectedActivity?.rawOldValue;
                    const rawNew = selectedActivity?.rawNewValue;
                    const hasRaw = (rawOld && typeof rawOld === "object") || (rawNew && typeof rawNew === "object");
                    const oldNewRows = !hasChanges && hasRaw ? buildOldNewRows(rawOld, rawNew) : [];

                    if (hasChanges) {
                      return (
                        <div className="border rounded-md">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[150px]">Field</TableHead>
                                <TableHead className="text-red-600">Old Value</TableHead>
                                <TableHead className="text-green-600">New Value</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {changes!.map((change, index) => (
                                <TableRow key={index}>
                                  <TableCell className="font-medium">{change.field}</TableCell>
                                  <TableCell className="text-red-600/80 line-through text-sm">
                                    {change.oldValue ?? "—"}
                                  </TableCell>
                                  <TableCell className="text-green-600 font-medium text-sm">
                                    {change.newValue ?? "—"}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      );
                    }
                    if (oldNewRows.length > 0) {
                      return (
                        <div className="border rounded-md">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[150px]">Field</TableHead>
                                <TableHead className="text-red-600">Old Value</TableHead>
                                <TableHead className="text-green-600">New Value</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {oldNewRows.map((row, index) => (
                                <TableRow key={index}>
                                  <TableCell className="font-medium">{row.field}</TableCell>
                                  <TableCell className="text-red-600/80 text-sm">
                                    {row.oldValue ?? "—"}
                                  </TableCell>
                                  <TableCell className="text-green-600 text-sm">
                                    {row.newValue ?? "—"}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      );
                    }
                    return (
                      <div className="text-center py-8 text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
                        <p>No detailed changes recorded for this activity.</p>
                        {selectedActivity?.description && (
                          <p className="text-sm mt-2">{selectedActivity.description}</p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
