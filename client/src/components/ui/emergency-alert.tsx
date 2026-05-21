import { useEffect, useState } from "react";
import { useAlert, AlertType } from "@/context/alert-context";
import { useAuth } from "@/context/auth-context";
import { AlertTriangle, CheckCircle, Megaphone, PartyPopper, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const isMaintenanceType = (t: AlertType) =>
  t === "maintenance_scheduled" || t === "maintenance_live";

export function EmergencyAlert() {
  const { isActive, message, acknowledgeAlert, targetRoles, title, type } = useAlert();

  let user = null;
  try {
    const auth = useAuth();
    user = auth.user;
  } catch {
    user = null;
  }

  const [canAcknowledge, setCanAcknowledge] = useState(false);

  const isMaintenance = isMaintenanceType(type);

  const isTargeted =
    isActive &&
    user &&
    (targetRoles?.includes("all") ||
      targetRoles?.includes(user.role) ||
      (isMaintenance && user.role !== "developer") ||
      (!isMaintenance &&
        (user.role === "superadmin" || user.role === "director")));

  const shouldShowAlert = isTargeted;

  useEffect(() => {
    if (shouldShowAlert) {
      setCanAcknowledge(true);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [shouldShowAlert]);

  if (!shouldShowAlert) return null;

  const getThemeStyles = (t: AlertType) => {
    switch (t) {
      case "maintenance_live":
        return {
          overlay: "bg-amber-600/90",
          card: "bg-amber-700/85 border-amber-300",
          iconBg: "text-amber-600",
          divider: "bg-amber-200",
          text: "text-amber-50",
          buttonText: "text-amber-800",
          buttonHoverBorder: "hover:border-amber-200",
        };
      case "maintenance_scheduled":
        return {
          overlay: "bg-blue-600/90",
          card: "bg-blue-700/85 border-blue-300",
          iconBg: "text-blue-600",
          divider: "bg-blue-200",
          text: "text-blue-50",
          buttonText: "text-blue-700",
          buttonHoverBorder: "hover:border-blue-200",
        };
      case "emergency":
        return {
          overlay: "bg-red-600/85",
          card: "bg-red-700/80 border-red-400",
          iconBg: "text-red-600",
          divider: "bg-red-300",
          text: "text-red-50",
          buttonText: "text-red-700",
          buttonHoverBorder: "hover:border-red-200",
        };
      case "good_news":
        return {
          overlay: "bg-green-600/85",
          card: "bg-green-700/80 border-green-400",
          iconBg: "text-green-600",
          divider: "bg-green-300",
          text: "text-green-50",
          buttonText: "text-green-700",
          buttonHoverBorder: "hover:border-green-200",
        };
      case "announcement":
      default:
        return {
          overlay: "bg-blue-600/85",
          card: "bg-blue-700/80 border-blue-400",
          iconBg: "text-blue-600",
          divider: "bg-blue-300",
          text: "text-blue-50",
          buttonText: "text-blue-700",
          buttonHoverBorder: "hover:border-blue-200",
        };
    }
  };

  const theme = getThemeStyles(type);

  const Icon =
    type === "emergency" ? AlertTriangle :
    type === "good_news" ? PartyPopper :
    isMaintenance ? Wrench :
    Megaphone;

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            "fixed inset-0 z-[9999] flex flex-col items-center justify-center backdrop-blur-md text-white p-4",
            theme.overlay
          )}
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10 pointer-events-none" />

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring" }}
            className={cn(
              "relative max-w-2xl w-full backdrop-blur-md border-4 rounded-xl p-8 md:p-12 shadow-2xl flex flex-col items-center text-center space-y-8",
              theme.card
            )}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-20" />
              <div className={cn("bg-white p-4 rounded-full relative shadow-lg", theme.iconBg)}>
                <Icon className="w-16 h-16 md:w-20 md:h-20" />
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl md:text-5xl font-black uppercase tracking-widest text-white drop-shadow-md">
                {title}
              </h1>
              <div className={cn("h-1 w-32 mx-auto rounded-full", theme.divider)} />
            </div>

            <div className="bg-black/20 rounded-lg p-6 w-full border border-white/10">
              <p className={cn("text-xl md:text-2xl font-medium leading-relaxed", theme.text)}>
                {message}
              </p>
            </div>

            <div className="pt-4">
              <Button
                onClick={acknowledgeAlert}
                disabled={!canAcknowledge}
                size="lg"
                className={cn(
                  "bg-white font-bold text-lg px-8 py-6 h-auto shadow-xl border-2 border-transparent transition-all transform hover:scale-105 active:scale-95",
                  theme.buttonText,
                  theme.buttonHoverBorder
                )}
              >
                <CheckCircle className="mr-3 w-6 h-6" />
                I Acknowledge This Message
              </Button>
              <p className={cn("mt-4 text-sm opacity-80", theme.text)}>
                {isMaintenance && type === "maintenance_live"
                  ? "After acknowledging, you will see the maintenance screen until service is restored."
                  : "Action required to restore system access"}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
