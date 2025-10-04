import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import {debugEvents} from './debugEvents';

type DebugContextValue = {
  lastRequestId: string | null;
  setLastRequestId: (requestId: string | null) => void;
};

const DebugContext = createContext<DebugContextValue | undefined>(undefined);

export const DebugProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = debugEvents.onRequestId(setLastRequestId);
    return unsubscribe;
  }, []);

  const value = useMemo(
    () => ({
      lastRequestId,
      setLastRequestId,
    }),
    [lastRequestId],
  );

  return <DebugContext.Provider value={value}>{children}</DebugContext.Provider>;
};

export const useDebug = (): DebugContextValue => {
  const context = useContext(DebugContext);
  if (!context) {
    throw new Error('useDebug must be used within a DebugProvider');
  }
  return context;
};
