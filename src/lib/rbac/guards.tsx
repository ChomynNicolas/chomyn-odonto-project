// RBAC Guard Components

'use client';

import React from 'react';
import type { RolNombre } from '@/types/patient';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

interface RoleGuardProps {
  allowedRoles: RolNombre[];
  currentRole: RolNombre;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGuard({ 
  allowedRoles, 
  currentRole, 
  children, 
  fallback = null 
}: RoleGuardProps) {
  if (!allowedRoles.includes(currentRole)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

interface RestrictedSectionProps {
  message?: string;
}

export function RestrictedSection({ 
  message = "Esta información está restringida al personal clínico." 
}: RestrictedSectionProps) {
  return (
    <Alert variant="default" className="bg-muted">
      <ShieldAlert className="h-4 w-4" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
