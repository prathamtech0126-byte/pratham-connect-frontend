import React, { createContext, useContext, useState, ReactNode } from 'react';

type AlertContextType = {
  isActive: boolean;
  message: string;
  triggerAlert: (message: string, targetRoles?: string[]) => void;
  acknowledgeAlert: () => void;
  targetRoles?: string[];
};

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [message, setMessage] = useState('');
  const [targetRoles, setTargetRoles] = useState<string[]>([]);

  const triggerAlert = (msg: string, roles: string[] = ['all']) => {
    setMessage(msg);
    setTargetRoles(roles);
    setIsActive(true);
  };

  const acknowledgeAlert = () => {
    setIsActive(false);
    setMessage('');
    setTargetRoles([]);
  };

  return (
    <AlertContext.Provider value={{ isActive, message, triggerAlert, acknowledgeAlert, targetRoles }}>
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
