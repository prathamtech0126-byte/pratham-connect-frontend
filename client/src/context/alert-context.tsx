import React, { createContext, useContext, useState, ReactNode } from 'react';

type AlertContextType = {
  isActive: boolean;
  message: string;
  triggerAlert: (message: string, targetRoles?: string[]) => void;
  acknowledgeAlert: () => void;
  targetRoles?: string[];
  pendingAlert: PendingAlert | null;
  clearPendingAlert: () => void;
  activatePendingAlert: () => void;
};

type PendingAlert = {
  message: string;
  targetRoles: string[];
  timestamp: number;
};

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [message, setMessage] = useState('');
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [pendingAlert, setPendingAlert] = useState<PendingAlert | null>(null);

  // Check storage on mount
  React.useEffect(() => {
    const stored = localStorage.getItem('emergency_alert');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // If alert is recent (e.g. last 24h) and not acknowledged in session
        // Simulating "not acknowledged" by just checking existence for now
        setPendingAlert(parsed);
      } catch (e) {
        console.error("Failed to parse alert", e);
      }
    }
  }, []);

  const triggerAlert = (msg: string, roles: string[] = ['all']) => {
    setMessage(msg);
    setTargetRoles(roles);
    setIsActive(true);
    
    // Save to storage to simulate persistence for offline users
    const alertData = { message: msg, targetRoles: roles, timestamp: Date.now() };
    localStorage.setItem('emergency_alert', JSON.stringify(alertData));
  };

  const acknowledgeAlert = () => {
    setIsActive(false);
    setMessage('');
    setTargetRoles([]);
    
    // Clear from storage so it doesn't show again
    localStorage.removeItem('emergency_alert');
    setPendingAlert(null);
  };

  const clearPendingAlert = () => {
    localStorage.removeItem('emergency_alert');
    setPendingAlert(null);
  };

  const activatePendingAlert = () => {
    if (pendingAlert) {
      triggerAlert(pendingAlert.message, pendingAlert.targetRoles);
      // It's now active, so we can clear the "pending" state visually from notifications
      // effectively moving it to "Active Alert"
      setPendingAlert(null); 
    }
  };

  return (
    <AlertContext.Provider value={{ 
      isActive, 
      message, 
      triggerAlert, 
      acknowledgeAlert, 
      targetRoles,
      pendingAlert,
      clearPendingAlert,
      activatePendingAlert
    }}>
      {children}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}
