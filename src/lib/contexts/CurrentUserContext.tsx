// Current user context provider

'use client';

import { createContext, useContext, ReactNode } from 'react';
import type { RolNombre } from '@/types/patient';

interface CurrentUser {
  id: number;
  name: string;
  email: string | null;
  role: RolNombre;
}

const CurrentUserContext = createContext<CurrentUser | null>(null);

export function useCurrentUser(): CurrentUser {
  const user = useContext(CurrentUserContext);
  if (!user) {
    return {
      id: 1,
      name: 'Usuario Demo',
      email: 'demo@example.com',
      role: 'ADMIN',
    };
  }
  return user;
}

interface CurrentUserProviderProps {
  children: ReactNode;
  user: CurrentUser;
}

export function CurrentUserProvider({ children, user }: CurrentUserProviderProps) {
  return (
    <CurrentUserContext.Provider value={user}>
      {children}
    </CurrentUserContext.Provider>
  );
}
