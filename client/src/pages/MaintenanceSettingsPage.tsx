import { useEffect, useState } from "react";
import maintenanceImage from "@/assets/images/maintanance_img.jpeg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageWrapper } from "@/layout/PageWrapper";
import { useMaintenance } from "@/context/maintenance-context";
import { cn } from "@/lib/utils";
import { Wrench } from "lucide-react";

function formatTime(t: string | null): string {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m} ${ampm}`;
}

export default function MaintenanceSettingsPage() {
  const {
    isActive: isMaintenanceActive,
    armed: isMaintenanceArmed,
    isScheduled: isMaintenanceScheduled,
    startTime: maintenanceStartTime,
    endTime: maintenanceEndTime,
    toggle: toggleMaintenance,
    isToggling,
  } = useMaintenance();

  const [maintenanceFrom, setMaintenanceFrom] = useState("13:00");
  const [maintenanceTo, setMaintenanceTo] = useState("15:00");

  useEffect(() => {
    if (maintenanceStartTime) setMaintenanceFrom(maintenanceStartTime);
    if (maintenanceEndTime) setMaintenanceTo(maintenanceEndTime);
  }, [maintenanceStartTime, maintenanceEndTime]);

  return (
    <PageWrapper
      title="Maintenance"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Maintenance" },
      ]}
    >
      <div className="grid gap-8 lg:grid-cols-2 lg:items-start max-w-5xl">
        <div className="rounded-xl border bg-card p-6 flex flex-col items-center justify-center">
          <img
            src={maintenanceImage}
            alt="Maintenance"
            className="w-full max-w-md"
          />
          <p className="mt-4 text-sm text-muted-foreground text-center max-w-sm">
            Users see this screen while maintenance is live. Schedule a window or activate
            immediately below.
          </p>
        </div>

        <div
          className={cn(
            "rounded-xl border p-6 space-y-5 transition-colors",
            isMaintenanceActive || isMaintenanceArmed
              ? "border-amber-500/40 bg-amber-500/5"
              : "bg-card"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <Wrench className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Maintenance Mode</h2>
              <p className="text-sm text-muted-foreground">
                Block non-developer users during scheduled or immediate maintenance.
              </p>
            </div>
            {isMaintenanceActive && (
              <span className="ml-auto text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1 rounded-full">
                LIVE
              </span>
            )}
            {!isMaintenanceActive && isMaintenanceScheduled && (
              <span className="ml-auto text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded-full">
                SCHEDULED
              </span>
            )}
          </div>

          {!isMaintenanceArmed ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">From</label>
                  <Input
                    type="time"
                    value={maintenanceFrom}
                    onChange={(e) => setMaintenanceFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">To</label>
                  <Input
                    type="time"
                    value={maintenanceTo}
                    onChange={(e) => setMaintenanceTo(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Maintenance turns on automatically between these times each day (server local
                time).
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  onClick={() => toggleMaintenance(true, maintenanceFrom, maintenanceTo)}
                  disabled={isToggling}
                  className="bg-amber-500 hover:bg-amber-600 text-white flex-1"
                >
                  {isToggling ? "Updating…" : "Schedule Maintenance"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => toggleMaintenance(true)}
                  disabled={isToggling}
                  className="flex-1 border-amber-500/50 text-amber-700 dark:text-amber-400"
                >
                  Activate Now
                </Button>
              </div>
            </>
          ) : (
            <>
              {maintenanceStartTime && maintenanceEndTime ? (
                <p className="text-sm text-muted-foreground">
                  Window:{" "}
                  <span className="font-medium text-foreground">
                    {formatTime(maintenanceStartTime)} – {formatTime(maintenanceEndTime)}
                  </span>
                  {isMaintenanceScheduled && !isMaintenanceActive && (
                    <span> (starts automatically)</span>
                  )}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Immediate maintenance is active for all non-developer users.
                </p>
              )}
              <Button
                onClick={() => toggleMaintenance(false)}
                disabled={isToggling}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
              >
                {isToggling ? "Updating…" : "Restore Normal Mode"}
              </Button>
            </>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
