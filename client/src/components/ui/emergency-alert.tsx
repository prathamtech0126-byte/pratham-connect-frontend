import { useEffect, useState } from "react";
import { useAlert } from "@/context/alert-context";
import { useAuth } from "@/context/auth-context";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export function EmergencyAlert() {
  const { isActive, message, acknowledgeAlert, targetRoles } = useAlert();
  const { user } = useAuth();
  const [canAcknowledge, setCanAcknowledge] = useState(false);

  // Check if current user is targeted
  const isTargeted = isActive && user && (
    targetRoles?.includes('all') || 
    targetRoles?.includes(user.role)
  );

  // User request update: 
  // 1. "also add director" -> Directors should be frozen.
  // 2. "right now also red alert message show in admin so i can test it" -> Admin should be frozen for testing.
  // 
  // Previously we excluded superadmin/director to prevent "sender freeze", but user explicitly wants to test it 
  // and wants directors included. So we remove the exclusion logic.
  
  const shouldShowAlert = isTargeted;

  useEffect(() => {
    if (shouldShowAlert) {
      setCanAcknowledge(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [shouldShowAlert]);

  if (!shouldShowAlert) return null;

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-red-600 text-white p-4"
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10 pointer-events-none"></div>
          
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring" }}
            className="relative max-w-2xl w-full bg-red-700/50 backdrop-blur-sm border-4 border-red-400 rounded-xl p-8 md:p-12 shadow-2xl flex flex-col items-center text-center space-y-8"
          >
            {/* Pulsing Warning Icon */}
            <div className="relative">
              <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-20"></div>
              <div className="bg-white text-red-600 p-4 rounded-full relative shadow-lg">
                <AlertTriangle className="w-16 h-16 md:w-20 md:h-20" />
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-widest text-white drop-shadow-md">
                Emergency Alert
              </h1>
              <div className="h-1 w-32 bg-red-300 mx-auto rounded-full"></div>
            </div>

            <div className="bg-black/20 rounded-lg p-6 w-full border border-white/10">
              <p className="text-xl md:text-2xl font-medium leading-relaxed text-red-50">
                {message}
              </p>
            </div>

            <div className="pt-4">
              <Button 
                onClick={acknowledgeAlert}
                size="lg" 
                className="bg-white text-red-700 hover:bg-red-50 hover:text-red-800 font-bold text-lg px-8 py-6 h-auto shadow-xl border-2 border-transparent hover:border-red-200 transition-all transform hover:scale-105 active:scale-95"
              >
                <CheckCircle className="mr-3 w-6 h-6" />
                I Acknowledge This Alert
              </Button>
              <p className="mt-4 text-red-200 text-sm opacity-80">
                Action required to restore system access
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
