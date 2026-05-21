import maintenanceImage from "@/assets/images/maintanance_img.jpeg";
import { useMaintenance } from "@/context/maintenance-context";

function formatTime(t: string | null): string {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m} ${ampm}`;
}

export default function MaintenancePage() {
  const { startTime, endTime } = useMaintenance();
  const hasTimeWindow = startTime && endTime;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-lg w-full text-center space-y-6">
        <img
          src={maintenanceImage}
          alt="Under Maintenance"
          className="w-full max-w-sm mx-auto"
        />

        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-foreground">
            Pratham Connect is currently under maintenance.
          </h1>

          {hasTimeWindow ? (
            <p className="text-muted-foreground text-sm leading-relaxed">
              Our services will be temporarily unavailable from{" "}
              <span className="font-semibold text-foreground">{formatTime(startTime)}</span> to{" "}
              <span className="font-semibold text-foreground">{formatTime(endTime)}</span>.
              <br />
              We apologize for the inconvenience and appreciate your patience.
            </p>
          ) : (
            <p className="text-muted-foreground text-sm leading-relaxed">
              Our services are temporarily unavailable. We apologize for the inconvenience and
              appreciate your patience.
            </p>
          )}

          <p className="text-sm font-medium text-foreground">We will be back soon.</p>
        </div>

        <div className="h-px bg-border" />
        <p className="text-xs text-muted-foreground">Pratham Connect</p>
      </div>
    </div>
  );
}
