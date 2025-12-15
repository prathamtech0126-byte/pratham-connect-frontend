import React, { createContext, useContext, useState, ReactNode } from 'react';

type AlertContextType = {
  isActive: boolean;
  message: string;
  triggerAlert: (message: string) => void;
  acknowledgeAlert: () => void;
};

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [message, setMessage] = useState('');

  const triggerAlert = (msg: string) => {
    setMessage(msg);
    setIsActive(true);
  };

  const acknowledgeAlert = () => {
    setIsActive(false);
    setMessage('');
  };

  return (
    <AlertContext.Provider value={{ isActive, message, triggerAlert, acknowledgeAlert }}>
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
