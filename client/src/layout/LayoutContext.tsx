import React, { createContext, useContext, useState } from 'react';

interface LayoutContextType {
  title: string;
  setTitle: (title: string) => void;
  breadcrumbs: { label: string; href?: string }[];
  setBreadcrumbs: (breadcrumbs: { label: string; href?: string }[]) => void;
  actions: React.ReactNode;
  setActions: (actions: React.ReactNode) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [title, setTitle] = useState("");
  const [breadcrumbs, setBreadcrumbs] = useState<{ label: string; href?: string }[]>([]);
  const [actions, setActions] = useState<React.ReactNode>(null);

  return (
    <LayoutContext.Provider value={{ title, setTitle, breadcrumbs, setBreadcrumbs, actions, setActions }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
}
