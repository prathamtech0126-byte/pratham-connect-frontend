import { useEffect, useMemo, useState } from "react";
import { PageWrapper } from "@/layout/PageWrapper";
import { clientService } from "@/services/clientService";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { useSocket } from "@/context/socket-context";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { X, Loader2, Pencil, RefreshCcw, Trash2 } from "lucide-react";

type DeviceType =
  | "laptop"
  | "mobile"
  | "desktop"
  | "display"
  | "mouse"
  | "keyboard"
  | "network-wifi"
  | "printer"
  | "scanner"
  | "monitor"
  | "webcam"
  | "headset"
  | "other";

const DEVICE_TYPE_OPTIONS: DeviceType[] = [
  "laptop",
  "mobile",
  "desktop",
  "printer",
  "monitor",
  "webcam",
  "other",
];

// Expensive categories: single unit only with fixed product/serial number.
const SINGLE_PRODUCT_NUMBER_TYPES = new Set<DeviceType>(["laptop", "monitor", "mobile"]);

type DeviceRow = {
  id: number;
  deviceName: string | null;
  prathamProductCode: string | null;
  product: string | null;
  accessories: string | null;
  hardwareDetail: string | null;
  serialNumber: string | null;
  vendorName: string | null;
  invoice: string | null;
  invoiceDate: string | null;
  price: string | null;
  deviceType: DeviceType | string;
  productNumber: string | null;
  companyType: string | null;
  status: "available" | "assigned";
  currentUserId: number | null;
  currentUserName: string | null;
  updatedAt?: string;
  onRepair?: boolean;
  assignmentAccessories?: string | null;
};

type AssignmentHistoryRow = {
  id: number;
  userId: number;
  userName: string | null;
  assignedAt: string;
  unassignedAt: string | null;
  isActive: boolean;
  assignmentAccessories?: string | null;
};

const DEVICES_UPDATED_EVENT = "techSupport:devicesUpdated";

function parsePrice(price: string | null | undefined) {
  if (!price) return 0;
  const numeric = String(price).replace(/[^0-9.-]/g, "");
  const parsed = Number(numeric);
  return Number.isFinite(parsed) ? parsed : 0;
}

const MAX_LENGTHS = {
  deviceName: 90,
  prathamProductCode: 30,
  hardwareDetail: 120,
  serialNumber: 40,
  vendorName: 60,
  invoice: 30,
  companyType: 50,
  accessories: 90,
} as const;

type DeviceFormState = {
  deviceType: DeviceType;
  deviceName: string;
  prathamProductCode: string;
  hardwareDetail: string;
  serialNumber: string;
  vendorName: string;
  invoice: string;
  invoiceDate: string;
  price: string;
  companyType: string;
};

function normalizePriceInput(value: string) {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const [intPart, ...decimalParts] = cleaned.split(".");
  const decimals = decimalParts.join("").slice(0, 2);
  return decimals.length > 0 ? `${intPart}.${decimals}` : intPart;
}

function validateDeviceForm(form: DeviceFormState, isBulkMode = false) {
  const errors: Record<string, string> = {};

  if (!form.deviceType) {
    errors.deviceType = "Device type is required.";
  }

  if (form.deviceType === "other" && !form.deviceName.trim()) {
    errors.deviceName = "Device name is required for type 'other'.";
  }

  if (!isBulkMode && !form.prathamProductCode.trim()) {
    errors.prathamProductCode = "Product code is required.";
  }

  if (!form.serialNumber.trim()) {
    errors.serialNumber = "Product serial number is required.";
  }

  if (!form.price.trim()) {
    errors.price = "Price is required.";
  } else {
    const normalized = normalizePriceInput(form.price.trim());
    if (!/^[0-9]+(?:\.[0-9]{1,2})?$/.test(normalized)) {
      errors.price = "Price must be a valid number (up to 2 decimals).";
    }
  }

  if (form.invoiceDate.trim()) {
    const date = new Date(form.invoiceDate);
    if (Number.isNaN(date.getTime())) {
      errors.invoiceDate = "Please select a valid invoice date.";
    }
  }

  if (form.deviceName.length > MAX_LENGTHS.deviceName) {
    errors.deviceName = `Device name must be ${MAX_LENGTHS.deviceName} characters or less.`;
  }

  if (form.prathamProductCode.length > MAX_LENGTHS.prathamProductCode) {
    errors.prathamProductCode = `Product code must be ${MAX_LENGTHS.prathamProductCode} characters or less.`;
  }

  if (form.hardwareDetail.length > MAX_LENGTHS.hardwareDetail) {
    errors.hardwareDetail = `Product details must be ${MAX_LENGTHS.hardwareDetail} characters or less.`;
  }

  if (form.serialNumber.length > MAX_LENGTHS.serialNumber) {
    errors.serialNumber = `Product serial number must be ${MAX_LENGTHS.serialNumber} characters or less.`;
  }

  if (form.vendorName.length > MAX_LENGTHS.vendorName) {
    errors.vendorName = `Vendor name must be ${MAX_LENGTHS.vendorName} characters or less.`;
  }

  if (form.invoice.length > MAX_LENGTHS.invoice) {
    errors.invoice = `Invoice number must be ${MAX_LENGTHS.invoice} characters or less.`;
  }

  if (form.companyType.length > MAX_LENGTHS.companyType) {
    errors.companyType = `Product company must be ${MAX_LENGTHS.companyType} characters or less.`;
  }

  return errors;
}

function hasFormErrors(errors: Record<string, string>) {
  return Object.keys(errors).length > 0;
}

function parseAccessoriesList(raw: string | null | undefined) {
  if (!raw) return [];
  return String(raw)
    .split(/[,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatAccessoriesList(items: string[]) {
  return items.join(", ");
}

function renderAccessoryList(raw: string | null | undefined) {
  const items = parseAccessoriesList(raw);
  if (items.length === 0) return null;

  return (
    <div className="mt-1 space-y-1 text-xs text-slate-500">
      {items.map((item, index) => (
        <div key={index}>• {item}</div>
      ))}
    </div>
  );
}

function getErrorToastPayload(error: any, defaultTitle: string, defaultDescription: string) {
  const status = Number(error?.response?.status);
  if (status >= 500) {
    return {
      title: "Server error",
      description: "Something is wrong with the server. Please try after some time.",
      variant: "destructive" as const,
    };
  }

  return {
    title: defaultTitle,
    description: error?.response?.data?.message ?? error?.message ?? defaultDescription,
    variant: "destructive" as const,
  };
}

export default function DeviceInfo() {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const { toast } = useToast();

  const [showAddForm, setShowAddForm] = useState(false);
  const [viewMode, setViewMode] = useState<"add" | "assign">("add");
  const [detailPopupSource, setDetailPopupSource] = useState<"inventory" | "assignment">("inventory");
  const [editDeviceId, setEditDeviceId] = useState<number | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editForm, setEditForm] = useState<DeviceFormState>({
    deviceType: "laptop",
    deviceName: "",
    prathamProductCode: "",
    hardwareDetail: "",
    serialNumber: "",
    vendorName: "",
    invoice: "",
    invoiceDate: "",
    price: "",
    companyType: "",
  });
  const [addForm, setAddForm] = useState<DeviceFormState>({
    deviceType: "laptop",
    deviceName: "",
    prathamProductCode: "",
    hardwareDetail: "",
    serialNumber: "",
    vendorName: "",
    invoice: "",
    invoiceDate: "",
    price: "",
    companyType: "",
  });
  const [addFormErrors, setAddFormErrors] = useState<Record<string, string>>({});
  const [addFormSubmitAttempted, setAddFormSubmitAttempted] = useState(false);
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});
  const [assignmentAccessoriesError, setAssignmentAccessoriesError] = useState("");
  const [assignmentAccessories, setAssignmentAccessories] = useState<string[]>([]);
  const [assignmentAccessoryInput, setAssignmentAccessoryInput] = useState("");

  // Bulk device creation states
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkQuantity, setBulkQuantity] = useState<string>("2");
  const [bulkStartingCode, setBulkStartingCode] = useState<string>("");
  const [bulkQuantityError, setBulkQuantityError] = useState("");

  const assignableUsersQuery = useQuery({
    queryKey: ["devices-assignable-users"],
    queryFn: () => clientService.getTechAssignableUsers(),
    staleTime: 1000 * 60,
  });

  const devicesQuery = useQuery({
    queryKey: ["devices-inventory"],
    queryFn: () => clientService.getDeviceInventory(),
    staleTime: 1000 * 5,
  });

  const [selectedDeviceDetailId, setSelectedDeviceDetailId] = useState<number | null>(null);
  const [assignmentDetailDeviceId, setAssignmentDetailDeviceId] = useState<number | null>(null);
  const [assignUserId, setAssignUserId] = useState<number | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [isChangingDevice, setIsChangingDevice] = useState(false);
  const [isEditAccessoriesOnly, setIsEditAccessoriesOnly] = useState(false);
  const [isEditRetainedAccessories, setIsEditRetainedAccessories] = useState(false);

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogTitle, setConfirmDialogTitle] = useState("");
  const [confirmDialogDescription, setConfirmDialogDescription] = useState("");
  const [confirmDialogAction, setConfirmDialogAction] = useState<(() => void) | null>(null);

  const assignmentHistoryQuery = useQuery({
    queryKey: ["device-assignment-history", selectedDeviceDetailId],
    enabled: !!selectedDeviceDetailId,
    queryFn: async () => {
      if (!selectedDeviceDetailId) return [];
      return clientService.getDeviceAssignmentHistory({ deviceId: selectedDeviceDetailId });
    },
  });

  useEffect(() => {
    if (!socket) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const handle = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["devices-inventory"] });
        queryClient.invalidateQueries({ queryKey: ["devices-assignable-users"] });
        if (selectedDeviceDetailId) {
          queryClient.invalidateQueries({ queryKey: ["device-assignment-history", selectedDeviceDetailId] });
        }
      }, 100);
    };

    socket.on(DEVICES_UPDATED_EVENT, handle);
    return () => {
      socket.off(DEVICES_UPDATED_EVENT, handle);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [socket, queryClient, selectedDeviceDetailId]);

  const createDeviceMutation = useMutation({
    mutationFn: (payload: any) =>
      clientService.createDeviceInventory(payload),
    onSuccess: () => {
      toast({ title: "Device added successfully" });
      setShowAddForm(false);
      setAddForm({
        deviceType: "laptop",
        deviceName: "",
        prathamProductCode: "",
        hardwareDetail: "",
        serialNumber: "",
        vendorName: "",
        invoice: "",
        invoiceDate: "",
        price: "",
        companyType: "",
      });
      queryClient.invalidateQueries({ queryKey: ["devices-inventory"] });
    },
    onError: (err: any) => {
      toast(getErrorToastPayload(err, "Failed to add device", "Unable to add device. Please try again."));
    },
  });

  const createBulkDevicesMutation = useMutation({
    mutationFn: (payload: any) =>
      clientService.createBulkDeviceInventory(payload),
    onSuccess: (data: any) => {
      const count = data?.length || 0;
      toast({ title: `${count} device(s) added successfully` });
      setShowAddForm(false);
      setIsBulkMode(false);
      setAddForm({
        deviceType: "laptop",
        deviceName: "",
        prathamProductCode: "",
        hardwareDetail: "",
        serialNumber: "",
        vendorName: "",
        invoice: "",
        invoiceDate: "",
        price: "",
        companyType: "",
      });
      setBulkQuantity("2");
      setBulkStartingCode("");
      queryClient.invalidateQueries({ queryKey: ["devices-inventory"] });
    },
    onError: (err: any) => {
      toast(getErrorToastPayload(err, "Failed to add devices", "Unable to add bulk devices. Please try again."));
    },
  });

  const assignDeviceMutation = useMutation({
    mutationFn: async (payload: { deviceId: number; userId: number; accessories: string | null; oldDeviceId?: number | null }) => {
      if (payload.oldDeviceId) {
        await clientService.unassignDeviceInventory(payload.oldDeviceId);
      }
      return clientService.assignDeviceInventory(payload.deviceId, payload.userId, payload.accessories);
    },
    onSuccess: async () => {
      toast({ title: isEditAccessoriesOnly ? "Accessories updated successfully" : "Device assigned successfully" });
      setAssignModalOpen(false);
      setAssignUserId(null);
      setAssignmentAccessoryInput("");
      setAssignmentAccessories([]);
      setAssignmentDetailDeviceId(null);
      setIsChangingDevice(false);
      setIsEditAccessoriesOnly(false);
      setIsEditRetainedAccessories(false);
      await queryClient.refetchQueries({ queryKey: ["devices-inventory"] });
      await queryClient.refetchQueries({ queryKey: ["devices-assignable-users"] });
    },
    onError: (err: any) => {
      toast(getErrorToastPayload(err, "Operation failed", "Unable to complete the request. Please try again."));
    },
  });

  const updateRetainedAccessoriesMutation = useMutation({
    mutationFn: (payload: { userId: number; accessories: string | null }) =>
      clientService.updateUserRetainedAccessories(payload.userId, payload.accessories),
    onSuccess: async () => {
      toast({ title: "Retained accessories updated" });
      setAssignModalOpen(false);
      setIsEditRetainedAccessories(false);
      setAssignmentAccessories([]);
      await queryClient.refetchQueries({ queryKey: ["devices-assignable-users"] });
    },
    onError: (err: any) => {
      toast(
        getErrorToastPayload(
          err,
          "Failed to update accessories",
          "Unable to update retained accessories. Please try again."
        )
      );
    },
  });

  const unassignMutation = useMutation({
    mutationFn: (deviceId: number) => clientService.unassignDeviceInventory(deviceId),
    onSuccess: async (_data, deviceId) => {
      toast({ title: "Device unassigned successfully" });
      await queryClient.refetchQueries({ queryKey: ["devices-inventory"] });
      await queryClient.refetchQueries({ queryKey: ["devices-assignable-users"] });
      if (selectedDeviceDetailId) {
        await queryClient.refetchQueries({ queryKey: ["device-assignment-history", selectedDeviceDetailId] });
      }
      if (selectedDeviceDetailId === deviceId) setSelectedDeviceDetailId(null);
    },
    onError: (err: any) => {
      toast(getErrorToastPayload(err, "Failed to unassign device", "Unable to unassign the device. Please try again."));
    },
  });

  const toggleRepairMutation = useMutation({
    mutationFn: (payload: { deviceId: number; onRepair: boolean }) =>
      clientService.toggleDeviceRepairStatus(payload.deviceId, payload.onRepair),
    onSuccess: (data: any) => {
      toast({
        title: data.onRepair ? "Device sent for repair" : "Device marked as available",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ["devices-inventory"] });
    },
    onError: (err: any) => {
      toast(getErrorToastPayload(err, "Failed to update repair status", "Unable to update repair status. Please try again."));
    },
  });

  const deleteDeviceMutation = useMutation({
    mutationFn: (deviceId: number) => clientService.deleteDeviceInventory(deviceId),
    onSuccess: () => {
      toast({ title: "Device deleted successfully" });
      setSelectedDeviceDetailId(null);
      queryClient.invalidateQueries({ queryKey: ["devices-inventory"] });
    },
    onError: (err: any) => {
      toast(getErrorToastPayload(err, "Failed to delete device", "Unable to delete the device. Please try again."));
    },
  });

  const updateDeviceMutation = useMutation({
    mutationFn: ({ deviceId, payload }: { deviceId: number; payload: Record<string, any> }) =>
      clientService.updateDeviceInventory(deviceId, payload),
    onSuccess: () => {
      toast({ title: "Device updated successfully" });
      setShowEditForm(false);
      setEditDeviceId(null);
      queryClient.invalidateQueries({ queryKey: ["devices-inventory"] });
    },
    onError: (err: any) => {
      toast(getErrorToastPayload(err, "Failed to update device", "Unable to update the device. Please try again."));
    },
  });

  const devices = useMemo((): DeviceRow[] => {
    const data = devicesQuery.data ?? [];
    return Array.isArray(data) ? data : [];
  }, [devicesQuery.data]);

  const assignableUsers = useMemo(() => {
    const data = assignableUsersQuery.data ?? [];
    return Array.isArray(data) ? data : [];
  }, [assignableUsersQuery.data]);

  const sortedAssignableUsers = useMemo(() => {
    return [...assignableUsers].sort((a: any, b: any) => {
      const aAssigned = devices.filter((d) => d.currentUserId === a.id).length;
      const bAssigned = devices.filter((d) => d.currentUserId === b.id).length;
      if (aAssigned !== bAssigned) {
        return bAssigned - aAssigned;
      }
      return a.fullName.localeCompare(b.fullName);
    });
  }, [assignableUsers, devices]);

  const getRetainedAccessoriesForUser = (userId: number): string | null => {
    const u = assignableUsers.find((row: { id: number }) => row.id === userId) as
      | { retainedAccessories?: string | null }
      | undefined;
    return u?.retainedAccessories ?? null;
  };

  const selectedDetailDevice = useMemo(
    () => devices.find((d) => d.id === selectedDeviceDetailId) ?? null,
    [devices, selectedDeviceDetailId]
  );

  const { user } = useAuth();
  const isTechSupportUser = user?.role === "tech_support";

  const adminTotalPrice = useMemo(() => {
    return devices.reduce((sum, device) => sum + parsePrice(device.price), 0);
  }, [devices]);

  if (!isTechSupportUser) {
    return (
      <PageWrapper title="Device Info" breadcrumbs={[{ label: "Tech Support" }, { label: "Device Info" }]}>      
        <div className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-subheader">Device Inventory</CardTitle>
            </CardHeader>
            <CardContent>
              {devicesQuery.isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : devicesQuery.isError ? (
                <div className="text-center text-red-600 py-12">Failed to load devices. Please refresh the page.</div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pratham Product Code</TableHead>
                          <TableHead>Device Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Assigned To</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {devices.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              No devices available.
                            </TableCell>
                          </TableRow>
                        ) : (
                          devices.map((device) => {
                            const isAssigned = Boolean(device.currentUserId);
                            const status = device.onRepair
                              ? "On Repair"
                              : isAssigned
                              ? "Assigned"
                              : "Available";
                            const priceValue = parsePrice(device.price);
                            const formattedPrice = `₹${priceValue.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`;

                            return (
                              <TableRow key={device.id}>
                                <TableCell className="font-medium text-blue-700">
                                  {device.prathamProductCode ?? "—"}
                                </TableCell>
                                <TableCell>{device.deviceName ?? "—"}</TableCell>
                                <TableCell>{status}</TableCell>
                                <TableCell>{device.currentUserName ?? "—"}</TableCell>
                                <TableCell className="text-right">{formattedPrice}</TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex flex-col gap-2 rounded-lg border bg-slate-50 p-4 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>Total devices</span>
                      <span>{devices.length}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-slate-900">
                      <span>Total price</span>
                      <span>{`₹${adminTotalPrice.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Device Info" breadcrumbs={[{ label: "Tech Support" }, { label: "Device Info" }]}> 
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant={viewMode === "assign" ? "default" : "outline"} onClick={() => setViewMode("assign")}>
            Assign Device
          </Button>
          <Button variant={viewMode === "add" ? "default" : "outline"} onClick={() => setViewMode("add")}>
            Device Inventory
          </Button>
        </div>

        {viewMode === "assign" && (
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-subheader">Assignment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Manage device assignments for each user. Multiple devices can be assigned to the same user.
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-48">User</TableHead>
                      <TableHead>Assigned Devices</TableHead>
                      <TableHead className="text-right w-48">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedAssignableUsers.map((u: any) => {
                      const assignedDevices = devices.filter(d => d.currentUserId === u.id);
                      return (
                        <TableRow key={u.id} className="align-top">
                          <TableCell className="text-blue-700 font-medium pt-4">{u.fullName}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-3">
                              {assignedDevices.length === 0 ? (
                                <span className="text-muted-foreground text-sm italic">No device assigned</span>
                              ) : (
                                <div className="flex flex-col gap-2">
                                  {assignedDevices.map((dev) => (
                                    <div key={dev.id} className="flex items-start gap-2 bg-muted/30 rounded-md px-3 py-2">
                                      <div
                                        className="flex-1 min-w-0 cursor-pointer hover:opacity-70 transition-opacity"
                                        title="View device details"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedDeviceDetailId(dev.id);
                                          setDetailPopupSource("assignment");
                                        }}
                                      >
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="font-medium text-sm text-blue-700 underline-offset-2 hover:underline">{dev.prathamProductCode || "—"}</span>
                                          <span className="text-xs text-muted-foreground capitalize">{dev.deviceType}</span>
                                        </div>
                                        {renderAccessoryList(dev.assignmentAccessories)}
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          title="Edit device accessories"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setAssignUserId(u.id);
                                            setAssignmentDetailDeviceId(dev.id);
                                            setAssignmentAccessories(parseAccessoriesList(dev.assignmentAccessories || ""));
                                            setAssignmentAccessoryInput("");
                                            setIsEditAccessoriesOnly(true);
                                            setIsEditRetainedAccessories(false);
                                            setIsChangingDevice(false);
                                            setAssignModalOpen(true);
                                          }}
                                        >
                                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                        </Button>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          title="Reassign Device"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setAssignUserId(u.id);
                                            setAssignmentDetailDeviceId(null);
                                            setAssignmentAccessories(parseAccessoriesList(dev.assignmentAccessories || ""));
                                            setAssignmentAccessoryInput("");
                                            setIsChangingDevice(true);
                                            setIsEditAccessoriesOnly(false);
                                            setIsEditRetainedAccessories(false);
                                            setAssignModalOpen(true);
                                          }}
                                        >
                                          <RefreshCcw className="h-3.5 w-3.5 text-muted-foreground" />
                                        </Button>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          title="Unassign Device"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setConfirmDialogTitle("Confirm Unassign");
                                            setConfirmDialogDescription(
                                              `Unassign ${dev.prathamProductCode || "this device"} from ${u.fullName}? Accessories will stay under Retained accessories.`
                                            );
                                            setConfirmDialogAction(() => () => unassignMutation.mutate(dev.id));
                                            setConfirmDialogOpen(true);
                                          }}
                                          disabled={unassignMutation.isPending}
                                        >
                                          <X className="h-3.5 w-3.5 text-red-500" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {parseAccessoriesList(getRetainedAccessoriesForUser(u.id)).length > 0 && (
                                <div className="rounded-md border border-amber-200/80 bg-amber-50/50 px-3 py-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800/80">
                                        Retained accessories
                                      </p>
                                      {renderAccessoryList(getRetainedAccessoriesForUser(u.id))}
                                    </div>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      title="Edit retained accessories"
                                      className="shrink-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setAssignUserId(u.id);
                                        setAssignmentDetailDeviceId(null);
                                        setAssignmentAccessories(
                                          parseAccessoriesList(getRetainedAccessoriesForUser(u.id))
                                        );
                                        setAssignmentAccessoryInput("");
                                        setIsEditRetainedAccessories(true);
                                        setIsEditAccessoriesOnly(false);
                                        setIsChangingDevice(false);
                                        setAssignModalOpen(true);
                                      }}
                                    >
                                      <Pencil className="h-3.5 w-3.5 text-amber-700" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right pt-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAssignUserId(u.id);
                                setAssignmentDetailDeviceId(null);
                                setAssignmentAccessories([]);
                                setAssignmentAccessoryInput("");
                                setIsChangingDevice(false);
                                setIsEditAccessoriesOnly(false);
                                setIsEditRetainedAccessories(false);
                                setAssignModalOpen(true);
                              }}
                            >
                              + Assign Device
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}


          {viewMode === "add" && (
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-subheader">Device Inventory</CardTitle>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => {
                      setAddFormErrors({});
                      setAddFormSubmitAttempted(false);
                      setIsBulkMode(false);
                      setBulkQuantity("2");
                      setBulkStartingCode("");
                      setBulkQuantityError("");
                      setShowAddForm(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Add Device
                  </Button>
                  <Button 
                    onClick={() => {
                      setAddFormErrors((prev) => ({ ...prev, prathamProductCode: "" }));
                      setAddFormSubmitAttempted(false);
                      setIsBulkMode(true);
                      setBulkQuantity("2");
                      setBulkStartingCode("");
                      setBulkQuantityError("");
                      setShowAddForm(true);
                    }}
                    variant="outline"
                    className="border-blue-600 text-blue-600 hover:bg-blue-50"
                  >
                    Add Multiple Same Devices
                  </Button>
                </div>
              </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device Type</TableHead>
                      <TableHead>Pratham Product Code</TableHead>
                      <TableHead>Device Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Current User</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {devices.map((d) => {
                    const isAssigned = d.currentUserId != null;
                    return (
                      <TableRow 
                        key={d.id} 
                        className="cursor-pointer hover:bg-muted/50" 
                        onClick={() => {
                          setSelectedDeviceDetailId(d.id);
                          setDetailPopupSource("inventory");
                        }}
                      >
                        <TableCell>{d.deviceType}</TableCell>
                        <TableCell className="text-blue-700 font-medium">
                          {d.prathamProductCode || "—"}
                        </TableCell>
                        <TableCell>{d.deviceName || "—"}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {d.onRepair ? (
                              <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold w-fit">
                                ON REPAIR
                              </span>
                            ) : (
                              <span className={isAssigned ? "text-emerald-700 font-semibold" : "text-blue-700 font-semibold"}>
                                {isAssigned ? "Assigned" : "Available"}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{d.currentUserName || "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

        <Dialog open={showAddForm} onOpenChange={(open) => {
            setShowAddForm(open);
            if (open) {
              setAddFormErrors({});
              setAddFormSubmitAttempted(false);
            }
          }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto px-4 sm:px-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Add Device</DialogTitle>
            </DialogHeader>
            {addFormSubmitAttempted && hasFormErrors(addFormErrors) && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <strong>Please fill all required fields.</strong> Fix the highlighted fields below and submit again.
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label>Product Type *</Label>
                      <span className="text-xs text-muted-foreground">Required</span>
                    </div>
                    <Select value={addForm.deviceType} onValueChange={(v: DeviceType) => {
                      setAddForm((prev) => ({ ...prev, deviceType: v }));
                      setAddFormErrors((prev) => ({ ...prev, deviceType: "" }));
                    }}>
                      <SelectTrigger className={cn(addFormErrors.deviceType && "border-destructive focus-visible:ring-destructive")}><SelectValue placeholder="Select device type" /></SelectTrigger>
                      <SelectContent>
                        {DEVICE_TYPE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t.replace(/-/g, " ")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {addFormErrors.deviceType && <p className="text-xs text-destructive">{addFormErrors.deviceType}</p>}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label>Product Name {addForm.deviceType === "other" ? "*" : ""}</Label>
                      <span className="text-xs text-muted-foreground">{addForm.deviceName.length}/{MAX_LENGTHS.deviceName}</span>
                    </div>
                    <Input
                      aria-invalid={Boolean(addFormErrors.deviceName)}
                      className={cn(addFormErrors.deviceName && "border-destructive focus-visible:ring-destructive")}
                      maxLength={MAX_LENGTHS.deviceName}
                      value={addForm.deviceName}
                      onChange={(e) => {
                        const value = e.target.value.slice(0, MAX_LENGTHS.deviceName);
                        setAddForm((prev) => ({ ...prev, deviceName: value }));
                        setAddFormErrors((prev) => ({ ...prev, deviceName: "" }));
                      }}
                    />
                    {addFormErrors.deviceName && <p className="text-xs text-destructive">{addFormErrors.deviceName}</p>}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label>Product Code *</Label>
                      <span className="text-xs text-muted-foreground">{addForm.prathamProductCode.length}/{MAX_LENGTHS.prathamProductCode}</span>
                    </div>
                    <Input
                      aria-invalid={Boolean(addFormErrors.prathamProductCode)}
                      className={cn(addFormErrors.prathamProductCode && "border-destructive focus-visible:ring-destructive")}
                      maxLength={MAX_LENGTHS.prathamProductCode}
                      value={addForm.prathamProductCode}
                      disabled={isBulkMode}
                      placeholder={isBulkMode ? "Disabled in bulk mode" : "e.g., product912"}
                      onChange={(e) => {
                        const value = e.target.value.slice(0, MAX_LENGTHS.prathamProductCode);
                        setAddForm((prev) => ({ ...prev, prathamProductCode: value }));
                        setAddFormErrors((prev) => ({ ...prev, prathamProductCode: "" }));
                      }}
                    />
                    {addFormErrors.prathamProductCode && <p className="text-xs text-destructive">{addFormErrors.prathamProductCode}</p>}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label>Product Details</Label>
                      <span className="text-xs text-muted-foreground">{addForm.hardwareDetail.length}/{MAX_LENGTHS.hardwareDetail}</span>
                    </div>
                    <Input
                      aria-invalid={Boolean(addFormErrors.hardwareDetail)}
                      className={cn(addFormErrors.hardwareDetail && "border-destructive focus-visible:ring-destructive")}
                      maxLength={MAX_LENGTHS.hardwareDetail}
                      value={addForm.hardwareDetail}
                      onChange={(e) => {
                        const value = e.target.value.slice(0, MAX_LENGTHS.hardwareDetail);
                        setAddForm((prev) => ({ ...prev, hardwareDetail: value }));
                        setAddFormErrors((prev) => ({ ...prev, hardwareDetail: "" }));
                      }}
                    />
                    {addFormErrors.hardwareDetail && <p className="text-xs text-destructive">{addFormErrors.hardwareDetail}</p>}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label>Product Serial Number *</Label>
                      <span className="text-xs text-muted-foreground">{addForm.serialNumber.length}/{MAX_LENGTHS.serialNumber}</span>
                    </div>
                    <Input
                      maxLength={MAX_LENGTHS.serialNumber}
                      value={addForm.serialNumber}
                      onChange={(e) => {
                        const value = e.target.value.slice(0, MAX_LENGTHS.serialNumber);
                        setAddForm((prev) => ({ ...prev, serialNumber: value }));
                        setAddFormErrors((prev) => ({ ...prev, serialNumber: "" }));
                      }}
                    />
                    {addFormErrors.serialNumber && <p className="text-xs text-destructive">{addFormErrors.serialNumber}</p>}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label>Product Company</Label>
                      <span className="text-xs text-muted-foreground">{addForm.companyType.length}/{MAX_LENGTHS.companyType}</span>
                    </div>
                    <Input
                      aria-invalid={Boolean(addFormErrors.companyType)}
                      className={cn(addFormErrors.companyType && "border-destructive focus-visible:ring-destructive")}
                      maxLength={MAX_LENGTHS.companyType}
                      value={addForm.companyType}
                      onChange={(e) => {
                        const value = e.target.value.slice(0, MAX_LENGTHS.companyType);
                        setAddForm((prev) => ({ ...prev, companyType: value }));
                        setAddFormErrors((prev) => ({ ...prev, companyType: "" }));
                      }}
                    />
                    {addFormErrors.companyType && <p className="text-xs text-destructive">{addFormErrors.companyType}</p>}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label>Product Price</Label>
                      <span className="text-xs text-muted-foreground">Numeric only</span>
                    </div>
                    <Input
                      aria-invalid={Boolean(addFormErrors.price)}
                      className={cn(addFormErrors.price && "border-destructive focus-visible:ring-destructive")}
                      type="text"
                      inputMode="decimal"
                      value={addForm.price}
                      maxLength={12}
                      onChange={(e) => {
                        const value = normalizePriceInput(e.target.value).slice(0, 12);
                        setAddForm((prev) => ({ ...prev, price: value }));
                        setAddFormErrors((prev) => ({ ...prev, price: "" }));
                      }}
                    />
                    {addFormErrors.price && <p className="text-xs text-destructive">{addFormErrors.price}</p>}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label>Vendor Name</Label>
                      <span className="text-xs text-muted-foreground">{addForm.vendorName.length}/{MAX_LENGTHS.vendorName}</span>
                    </div>
                    <Input
                      maxLength={MAX_LENGTHS.vendorName}
                      value={addForm.vendorName}
                      onChange={(e) => {
                        const value = e.target.value.slice(0, MAX_LENGTHS.vendorName);
                        setAddForm((prev) => ({ ...prev, vendorName: value }));
                        setAddFormErrors((prev) => ({ ...prev, vendorName: "" }));
                      }}
                    />
                    {addFormErrors.vendorName && <p className="text-xs text-destructive">{addFormErrors.vendorName}</p>}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label>Invoice Number</Label>
                      <span className="text-xs text-muted-foreground">{addForm.invoice.length}/{MAX_LENGTHS.invoice}</span>
                    </div>
                    <Input
                      maxLength={MAX_LENGTHS.invoice}
                      value={addForm.invoice}
                      onChange={(e) => {
                        const value = e.target.value.slice(0, MAX_LENGTHS.invoice);
                        setAddForm((prev) => ({ ...prev, invoice: value }));
                        setAddFormErrors((prev) => ({ ...prev, invoice: "" }));
                      }}
                    />
                    {addFormErrors.invoice && <p className="text-xs text-destructive">{addFormErrors.invoice}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Invoice Date</Label>
                    <Input
                      aria-invalid={Boolean(addFormErrors.invoiceDate)}
                      className={cn(addFormErrors.invoiceDate && "border-destructive focus-visible:ring-destructive")}
                      type="date"
                      value={addForm.invoiceDate}
                      onChange={(e) => {
                        setAddForm((prev) => ({ ...prev, invoiceDate: e.target.value }));
                        setAddFormErrors((prev) => ({ ...prev, invoiceDate: "" }));
                      }}
                    />
                    {addFormErrors.invoiceDate && <p className="text-xs text-destructive">{addFormErrors.invoiceDate}</p>}
                  </div>
                </div>

                {isBulkMode && (
                  <div className="space-y-4 mt-6 p-4 bg-blue-50 rounded-md border border-blue-200">
                    <h3 className="text-sm font-semibold text-blue-900">Bulk Create Mode</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bulk-quantity">Number of Devices</Label>
                      <Input
                        id="bulk-quantity"
                        type="number"
                        min="2"
                        max="100"
                        value={bulkQuantity}
                        onChange={(e) => {
                          setBulkQuantity(e.target.value);
                          setBulkQuantityError("");
                        }}
                        placeholder="e.g., 5"
                      />
                      {bulkQuantityError && <p className="text-xs text-destructive">{bulkQuantityError}</p>}
                      <p className="text-xs text-muted-foreground">Enter number between 2 and 100</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bulk-starting-code">Starting Product Code</Label>
                      <Input
                        id="bulk-starting-code"
                        type="text"
                        value={bulkStartingCode}
                        onChange={(e) => setBulkStartingCode(e.target.value)}
                        placeholder="e.g., pratham912"
                      />
                      <p className="text-xs text-muted-foreground">
                        Code must end with a number (e.g., pratham912 → 912, 913, 914...)
                      </p>
                    </div>

                    {bulkQuantity && bulkStartingCode && (
                      <div className="text-xs bg-white p-2 rounded border border-blue-100">
                        <p className="text-blue-800">
                          <strong>Preview:</strong> Will create {bulkQuantity} devices with codes: {bulkStartingCode}, {bulkStartingCode.replace(/\d+$/, (m) => String(Number(m) + 1))}, ... ({bulkQuantity} total)
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 mt-6">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowAddForm(false);
                      setIsBulkMode(false);
                      setBulkQuantityError("");
                    }}
                  >
                    Close
                  </Button>
                  <div className="flex gap-2">
                    {isBulkMode && (
                      <Button 
                        variant="outline"
                        onClick={() => setIsBulkMode(false)}
                      >
                        Back to Single
                      </Button>
                    )}
                    <Button
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => {
                        setAddFormSubmitAttempted(true);
                        const errors = validateDeviceForm(addForm, isBulkMode);
                        if (Object.keys(errors).length > 0) {
                          setAddFormErrors(errors);
                          toast({
                            title: "Please fill all required fields",
                            description: "One or more required fields are missing or invalid.",
                            variant: "destructive",
                          });
                          return;
                        }

                        if (isBulkMode) {
                          setBulkQuantityError("");
                          const qty = Number(bulkQuantity);
                          if (!bulkQuantity || isNaN(qty) || qty < 2 || qty > 100) {
                            setBulkQuantityError("Please enter a number between 2 and 100");
                            return;
                          }
                          if (!bulkStartingCode.trim()) {
                            setBulkQuantityError("Starting product code is required");
                            return;
                          }
                          if (!/\d+$/.test(bulkStartingCode.trim())) {
                            setBulkQuantityError("Product code must end with a number (e.g., pratham912)");
                            return;
                          }

                          createBulkDevicesMutation.mutate({
                            baseFormData: {
                              deviceType: addForm.deviceType,
                              deviceName: addForm.deviceName || null,
                              hardwareDetail: addForm.hardwareDetail || null,
                              serialNumber: addForm.serialNumber || null,
                              vendorName: addForm.vendorName || null,
                              invoice: addForm.invoice || null,
                              invoiceDate: addForm.invoiceDate || null,
                              price: addForm.price || null,
                              product: null,
                              accessories: null,
                              productNumber: null,
                              companyType: addForm.companyType || null,
                            },
                            quantity: qty,
                            startingPrathamProductCode: bulkStartingCode.trim(),
                          });
                        } else {
                          createDeviceMutation.mutate({
                            deviceType: addForm.deviceType,
                            deviceName: addForm.deviceName || null,
                            prathamProductCode: addForm.prathamProductCode || null,
                            product: null,
                            accessories: null,
                            hardwareDetail: addForm.hardwareDetail || null,
                            serialNumber: addForm.serialNumber || null,
                            vendorName: addForm.vendorName || null,
                            invoice: addForm.invoice || null,
                            invoiceDate: addForm.invoiceDate || null,
                            price: addForm.price || null,
                            productNumber: null,
                            companyType: addForm.companyType || null,
                          });
                        }
                      }}
                      disabled={createDeviceMutation.isPending || createBulkDevicesMutation.isPending}
                    >
                      {createDeviceMutation.isPending || createBulkDevicesMutation.isPending 
                        ? (isBulkMode ? "Creating..." : "Adding...") 
                        : (isBulkMode ? `Create ${bulkQuantity} Devices` : "Add")}
                    </Button>
                  </div>
                </div>
            </DialogContent>
          </Dialog>

        {selectedDetailDevice && (
          <Dialog open={!!selectedDeviceDetailId} onOpenChange={() => setSelectedDeviceDetailId(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  Device Details: <span className="text-blue-600">{selectedDetailDevice.prathamProductCode}</span>
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-4 text-sm">
                  <div className="min-w-0 break-words"><span className="text-muted-foreground uppercase text-[10px] font-bold block">Type</span> {selectedDetailDevice.deviceType}</div>
                  <div className="min-w-0 break-words"><span className="text-muted-foreground uppercase text-[10px] font-bold block">Device Name</span> {selectedDetailDevice.deviceName || "—"}</div>
                  <div className="min-w-0 break-words"><span className="text-muted-foreground uppercase text-[10px] font-bold block">Hardware Detail</span> {selectedDetailDevice.hardwareDetail || "—"}</div>
                  <div className="min-w-0 break-words"><span className="text-muted-foreground uppercase text-[10px] font-bold block">Serial Number</span> {selectedDetailDevice.serialNumber || "—"}</div>
                  <div className="min-w-0 break-words"><span className="text-muted-foreground uppercase text-[10px] font-bold block">Vendor</span> {selectedDetailDevice.vendorName || "—"}</div>
                  <div className="min-w-0 break-words"><span className="text-muted-foreground uppercase text-[10px] font-bold block">Invoice #</span> {selectedDetailDevice.invoice || "—"}</div>
                  <div className="min-w-0 break-words"><span className="text-muted-foreground uppercase text-[10px] font-bold block">Invoice Date</span> {selectedDetailDevice.invoiceDate || "—"}</div>
                  <div className="min-w-0 break-words"><span className="text-muted-foreground uppercase text-[10px] font-bold block">Price</span> {selectedDetailDevice.price || "—"}</div>
                  <div className="min-w-0 break-words"><span className="text-muted-foreground uppercase text-[10px] font-bold block">Company Type</span> {selectedDetailDevice.companyType || "—"}</div>
                  <div className="min-w-0 break-words"><span className="text-muted-foreground uppercase text-[10px] font-bold block">Product Number</span> {selectedDetailDevice.productNumber || "—"}</div>
                  <div className="min-w-0 break-words"><span className="text-muted-foreground uppercase text-[10px] font-bold block">Current User</span> <span className="font-semibold">{selectedDetailDevice.currentUserName || "Not assigned"}</span></div>
                  <div className="min-w-0">
                    <span className="text-muted-foreground uppercase text-[10px] font-bold block">Assigned Accessories</span>
                    {renderAccessoryList(selectedDetailDevice.assignmentAccessories || selectedDetailDevice.accessories) || (
                      <span className="text-slate-500">None</span>
                    )}
                  </div>
                </div>
                {detailPopupSource === "inventory" && (
                  <div className="space-y-3">
                    <h4 className="font-bold text-sm border-b pb-1">Assignment History</h4>
                    <div className="border rounded-lg max-h-48 overflow-y-auto">
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead className="py-2">User</TableHead>
                            <TableHead className="py-2">Assigned At</TableHead>
                            <TableHead className="py-2">Unassigned At</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {assignmentHistoryQuery.isPending ? (
                            <TableRow><TableCell colSpan={3} className="text-center py-4"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></TableCell></TableRow>
                          ) : (assignmentHistoryQuery.data ?? []).length === 0 ? (
                            <TableRow><TableCell colSpan={3} className="text-center py-4 text-muted-foreground">No history found</TableCell></TableRow>
                          ) : (assignmentHistoryQuery.data ?? []).slice(0, 4).map((h: any) => (
                            <TableRow key={h.id}>
                              <TableCell className="py-2">{h.userName}</TableCell>
                              <TableCell className="py-2">{h.assignedAt ? new Date(h.assignedAt).toLocaleString("en-GB") : "—"}</TableCell>
                              <TableCell className="py-2">{h.unassignedAt ? new Date(h.unassignedAt).toLocaleString("en-GB") : (h.isActive ? "Current" : "—")}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                {detailPopupSource === "inventory" && (
                  <>
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => {
                        if (!selectedDetailDevice) return;
                        setEditDeviceId(selectedDetailDevice.id);
                        setEditForm({
                          deviceType: (selectedDetailDevice.deviceType as DeviceType) || "laptop",
                          deviceName: selectedDetailDevice.deviceName || "",
                          prathamProductCode: selectedDetailDevice.prathamProductCode || "",
                          hardwareDetail: selectedDetailDevice.hardwareDetail || "",
                          serialNumber: selectedDetailDevice.serialNumber || "",
                          vendorName: selectedDetailDevice.vendorName || "",
                          invoice: selectedDetailDevice.invoice || "",
                          invoiceDate: selectedDetailDevice.invoiceDate || "",
                          price: selectedDetailDevice.price || "",
                          companyType: selectedDetailDevice.companyType || "",
                        });
                        setShowEditForm(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                      Edit Details
                    </Button>
                    {selectedDetailDevice.currentUserId ? (
                      <Button
                        variant="destructive"
                        onClick={() => {
                          setConfirmDialogTitle("Confirm Unassign");
                          setConfirmDialogDescription("Are you sure you want to unassign this device?");
                          setConfirmDialogAction(() => () => unassignMutation.mutate(selectedDetailDevice.id));
                          setConfirmDialogOpen(true);
                        }}
                        disabled={unassignMutation.isPending}
                      >
                        {unassignMutation.isPending ? "Unassigning..." : "Unassign Current User"}
                      </Button>
                    ) : (
                      <Button
                        variant={selectedDetailDevice.onRepair ? "outline" : "destructive"}
                        className={!selectedDetailDevice.onRepair ? "bg-amber-600 hover:bg-amber-700 text-white border-none" : ""}
                        onClick={() => toggleRepairMutation.mutate({
                          deviceId: selectedDetailDevice.id,
                          onRepair: !selectedDetailDevice.onRepair
                        })}
                        disabled={toggleRepairMutation.isPending}
                      >
                        {toggleRepairMutation.isPending ? "Updating..." : selectedDetailDevice.onRepair ? "Mark as Available" : "Go for Repair"}
                      </Button>
                    )}
                  </>
                )}
                <Button variant="outline" onClick={() => setSelectedDeviceDetailId(null)}>Close</Button>
                
                {!selectedDetailDevice.currentUserId && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="ml-auto text-red-500 hover:text-red-700 hover:bg-red-50"
                    title="Delete Device"
                    onClick={() => {
                      setConfirmDialogTitle("Confirm Delete");
                      setConfirmDialogDescription("THIS ACTION IS PERMANENT. Are you sure you want to DELETE this device from the database?");
                      setConfirmDialogAction(() => () => deleteDeviceMutation.mutate(selectedDetailDevice.id));
                      setConfirmDialogOpen(true);
                    }}
                    disabled={deleteDeviceMutation.isPending}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}


        <Dialog
          open={assignModalOpen}
          onOpenChange={(open) => {
            setAssignModalOpen(open);
            if (!open) {
              setIsEditRetainedAccessories(false);
              setIsEditAccessoriesOnly(false);
              setIsChangingDevice(false);
            }
          }}
        >
          <DialogContent className="max-w-md px-4 sm:px-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                {isEditRetainedAccessories
                  ? "Edit Retained Accessories"
                  : isEditAccessoriesOnly
                    ? "Edit Device Accessories"
                    : isChangingDevice
                      ? "Change Device"
                      : "Assign Device"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">User</Label>
                <div className="p-2 border rounded-md bg-muted/30 font-semibold">{assignableUsers.find(u => u.id === assignUserId)?.fullName || "—"}</div>
              </div>

              {(isEditAccessoriesOnly || isChangingDevice) && !isEditRetainedAccessories && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Current Device</Label>
                  <div className="p-2 border rounded-md bg-orange-50 text-orange-800 font-medium">
                    {devices.find((d) => d.id === assignmentDetailDeviceId)?.prathamProductCode ||
                      devices.find((d) => d.currentUserId === assignUserId)?.prathamProductCode ||
                      "Unknown"}
                  </div>
                </div>
              )}

              {!isEditAccessoriesOnly && !isEditRetainedAccessories && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Select New Pratham Device ID *</Label>
                  <Select value={assignmentDetailDeviceId != null ? String(assignmentDetailDeviceId) : undefined} onValueChange={(v) => setAssignmentDetailDeviceId(Number(v))}>
                    <SelectTrigger className="w-full text-blue-700 font-medium border-blue-200">
                      <SelectValue placeholder="Choose an available device" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72 overflow-y-auto">
                      {devices.filter(d => d.currentUserId == null && !d.onRepair).map((d) => (
                        <SelectItem key={d.id} value={String(d.id)} className="font-medium">
                          {d.prathamProductCode}{d.deviceName ? ` / ${d.deviceName}` : ""}
                        </SelectItem>
                      ))}
                      {devices.filter(d => d.currentUserId == null && !d.onRepair).length === 0 && (
                        <SelectItem disabled value="none">No available devices</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                    {isEditRetainedAccessories ? "Retained accessories" : "Accessories in assignment"}
                  </Label>
                  <span className="text-xs text-muted-foreground">{assignmentAccessories.length} item{assignmentAccessories.length === 1 ? "" : "s"}</span>
                </div>

                <div className="space-y-2">
                  {assignmentAccessories.map((item, index) => (
                    <div key={`${item}-${index}`} className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="break-words text-sm">{item}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setAssignmentAccessories((prev) => prev.filter((_, i) => i !== index));
                        }}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                  <Input
                    maxLength={MAX_LENGTHS.accessories}
                    value={assignmentAccessoryInput}
                    onChange={(e) => {
                      setAssignmentAccessoryInput(e.target.value.slice(0, MAX_LENGTHS.accessories));
                      setAssignmentAccessoriesError("");
                    }}
                    placeholder="Add one accessory (e.g. adapter)"
                  />
                  <Button
                    type="button"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => {
                      const value = assignmentAccessoryInput.trim();
                      if (!value) return;
                      setAssignmentAccessories((prev) => [...prev, value]);
                      setAssignmentAccessoryInput("");
                    }}
                  >
                    Add
                  </Button>
                </div>

                {assignmentAccessoriesError && <p className="text-xs text-destructive">{assignmentAccessoriesError}</p>}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setAssignModalOpen(false)}>Cancel</Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 text-white" 
                  onClick={() => {
                    if (!assignUserId) return;

                    if (isEditRetainedAccessories) {
                      updateRetainedAccessoriesMutation.mutate({
                        userId: assignUserId,
                        accessories:
                          assignmentAccessories.length > 0
                            ? formatAccessoriesList(assignmentAccessories)
                            : null,
                      });
                      return;
                    }

                    if (!assignmentDetailDeviceId && !isEditAccessoriesOnly) {
                      toast({ title: "Please select a device" });
                      return;
                    }

                    const currentUserDevice = devices.find((d) => d.currentUserId === assignUserId);

                    assignDeviceMutation.mutate({
                      deviceId: assignmentDetailDeviceId!,
                      userId: assignUserId,
                      accessories:
                        assignmentAccessories.length > 0
                          ? formatAccessoriesList(assignmentAccessories)
                          : null,
                      oldDeviceId: isChangingDevice ? currentUserDevice?.id : null,
                    });
                  }} 
                  disabled={
                    !assignUserId ||
                    updateRetainedAccessoriesMutation.isPending ||
                    assignDeviceMutation.isPending ||
                    (!isEditRetainedAccessories &&
                      !assignmentDetailDeviceId &&
                      !isEditAccessoriesOnly)
                  }
                >
                  {updateRetainedAccessoriesMutation.isPending || assignDeviceMutation.isPending
                    ? "Processing..."
                    : isEditRetainedAccessories
                      ? "Save Retained Accessories"
                      : isEditAccessoriesOnly
                        ? "Update Accessories"
                        : "Confirm Assignment"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{confirmDialogTitle || "Confirm action"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-slate-700">{confirmDialogDescription}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => {
                  if (confirmDialogAction) confirmDialogAction();
                  setConfirmDialogOpen(false);
                }}
              >
                Confirm
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditForm} onOpenChange={(open) => { setShowEditForm(open); if (!open) setEditDeviceId(null); }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto px-4 sm:px-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Edit Device Details</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Device Type *</Label>
                  <span className="text-xs text-muted-foreground">Required</span>
                </div>
                <Select value={editForm.deviceType} onValueChange={(v: DeviceType) => {
                  setEditForm((prev) => ({ ...prev, deviceType: v }));
                  setEditFormErrors((prev) => ({ ...prev, deviceType: "" }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Select device type" /></SelectTrigger>
                  <SelectContent>
                    {DEVICE_TYPE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t.replace(/-/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
                {editFormErrors.deviceType && <p className="text-xs text-destructive">{editFormErrors.deviceType}</p>}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Device Name {editForm.deviceType === "other" ? "*" : ""}</Label>
                  <span className="text-xs text-muted-foreground">{editForm.deviceName.length}/{MAX_LENGTHS.deviceName}</span>
                </div>
                <Input
                  maxLength={MAX_LENGTHS.deviceName}
                  value={editForm.deviceName}
                  onChange={(e) => {
                    const value = e.target.value.slice(0, MAX_LENGTHS.deviceName);
                    setEditForm((prev) => ({ ...prev, deviceName: value }));
                    setEditFormErrors((prev) => ({ ...prev, deviceName: "" }));
                  }}
                />
                {editFormErrors.deviceName && <p className="text-xs text-destructive">{editFormErrors.deviceName}</p>}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Pratham Product Code *</Label>
                  <span className="text-xs text-muted-foreground">{editForm.prathamProductCode.length}/{MAX_LENGTHS.prathamProductCode}</span>
                </div>
                <Input
                  maxLength={MAX_LENGTHS.prathamProductCode}
                  value={editForm.prathamProductCode}
                  onChange={(e) => {
                    const value = e.target.value.slice(0, MAX_LENGTHS.prathamProductCode);
                    setEditForm((prev) => ({ ...prev, prathamProductCode: value }));
                    setEditFormErrors((prev) => ({ ...prev, prathamProductCode: "" }));
                  }}
                />
                {editFormErrors.prathamProductCode && <p className="text-xs text-destructive">{editFormErrors.prathamProductCode}</p>}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Hardware Detail</Label>
                  <span className="text-xs text-muted-foreground">{editForm.hardwareDetail.length}/{MAX_LENGTHS.hardwareDetail}</span>
                </div>
                <Input
                  maxLength={MAX_LENGTHS.hardwareDetail}
                  value={editForm.hardwareDetail}
                  onChange={(e) => {
                    const value = e.target.value.slice(0, MAX_LENGTHS.hardwareDetail);
                    setEditForm((prev) => ({ ...prev, hardwareDetail: value }));
                    setEditFormErrors((prev) => ({ ...prev, hardwareDetail: "" }));
                  }}
                />
                {editFormErrors.hardwareDetail && <p className="text-xs text-destructive">{editFormErrors.hardwareDetail}</p>}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Serial Number (Optional)</Label>
                  <span className="text-xs text-muted-foreground">{editForm.serialNumber.length}/{MAX_LENGTHS.serialNumber}</span>
                </div>
                <Input
                  maxLength={MAX_LENGTHS.serialNumber}
                  value={editForm.serialNumber}
                  onChange={(e) => {
                    const value = e.target.value.slice(0, MAX_LENGTHS.serialNumber);
                    setEditForm((prev) => ({ ...prev, serialNumber: value }));
                    setEditFormErrors((prev) => ({ ...prev, serialNumber: "" }));
                  }}
                />
                {editFormErrors.serialNumber && <p className="text-xs text-destructive">{editFormErrors.serialNumber}</p>}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Vendor Name (Person Name)</Label>
                  <span className="text-xs text-muted-foreground">{editForm.vendorName.length}/{MAX_LENGTHS.vendorName}</span>
                </div>
                <Input
                  maxLength={MAX_LENGTHS.vendorName}
                  value={editForm.vendorName}
                  onChange={(e) => {
                    const value = e.target.value.slice(0, MAX_LENGTHS.vendorName);
                    setEditForm((prev) => ({ ...prev, vendorName: value }));
                    setEditFormErrors((prev) => ({ ...prev, vendorName: "" }));
                  }}
                />
                {editFormErrors.vendorName && <p className="text-xs text-destructive">{editFormErrors.vendorName}</p>}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Invoice</Label>
                  <span className="text-xs text-muted-foreground">{editForm.invoice.length}/{MAX_LENGTHS.invoice}</span>
                </div>
                <Input
                  maxLength={MAX_LENGTHS.invoice}
                  value={editForm.invoice}
                  onChange={(e) => {
                    const value = e.target.value.slice(0, MAX_LENGTHS.invoice);
                    setEditForm((prev) => ({ ...prev, invoice: value }));
                    setEditFormErrors((prev) => ({ ...prev, invoice: "" }));
                  }}
                />
                {editFormErrors.invoice && <p className="text-xs text-destructive">{editFormErrors.invoice}</p>}
              </div>
              <div className="space-y-2">
                <Label>Invoice Date</Label>
                <Input
                  type="date"
                  value={editForm.invoiceDate}
                  onChange={(e) => {
                    setEditForm((prev) => ({ ...prev, invoiceDate: e.target.value }));
                    setEditFormErrors((prev) => ({ ...prev, invoiceDate: "" }));
                  }}
                />
                {editFormErrors.invoiceDate && <p className="text-xs text-destructive">{editFormErrors.invoiceDate}</p>}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Price</Label>
                  <span className="text-xs text-muted-foreground">Numeric only</span>
                </div>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={editForm.price}
                  maxLength={12}
                  onChange={(e) => {
                    const value = normalizePriceInput(e.target.value).slice(0, 12);
                    setEditForm((prev) => ({ ...prev, price: value }));
                    setEditFormErrors((prev) => ({ ...prev, price: "" }));
                  }}
                />
                {editFormErrors.price && <p className="text-xs text-destructive">{editFormErrors.price}</p>}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Company Type</Label>
                  <span className="text-xs text-muted-foreground">{editForm.companyType.length}/{MAX_LENGTHS.companyType}</span>
                </div>
                <Input
                  maxLength={MAX_LENGTHS.companyType}
                  value={editForm.companyType}
                  onChange={(e) => {
                    const value = e.target.value.slice(0, MAX_LENGTHS.companyType);
                    setEditForm((prev) => ({ ...prev, companyType: value }));
                    setEditFormErrors((prev) => ({ ...prev, companyType: "" }));
                  }}
                />
                {editFormErrors.companyType && <p className="text-xs text-destructive">{editFormErrors.companyType}</p>}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => { setShowEditForm(false); setEditDeviceId(null); }}>Cancel</Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                disabled={updateDeviceMutation.isPending}
                onClick={() => {
                  if (!editDeviceId) return;
                  const errors = validateDeviceForm(editForm);
                  if (Object.keys(errors).length > 0) {
                    setEditFormErrors(errors);
                    toast({
                      title: "Please fill all required fields",
                      description: "One or more required fields are missing or invalid.",
                      variant: "destructive",
                    });
                    return;
                  }

                  updateDeviceMutation.mutate({
                    deviceId: editDeviceId,
                    payload: {
                      deviceType: editForm.deviceType,
                      deviceName: editForm.deviceName || null,
                      prathamProductCode: editForm.prathamProductCode || null,
                      hardwareDetail: editForm.hardwareDetail || null,
                      serialNumber: editForm.serialNumber || null,
                      vendorName: editForm.vendorName || null,
                      invoice: editForm.invoice || null,
                      invoiceDate: editForm.invoiceDate || null,
                      price: editForm.price || null,
                      companyType: editForm.companyType || null,
                    },
                  });
                }}
              >
                {updateDeviceMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PageWrapper>
  );
}
