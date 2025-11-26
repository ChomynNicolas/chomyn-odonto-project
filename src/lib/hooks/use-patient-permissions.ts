// React hook for patient permissions based on user role
// Integrates with NextAuth v5 session

'use client';

import { useSession } from 'next-auth/react';
import { useMemo } from 'react';
import { getPermissions, type RBACPermissions } from '@/lib/utils/rbac';
import type { RolNombre } from '@/types/patient';

export interface UsePatientPermissionsReturn {
  permissions: RBACPermissions | null;
  role: RolNombre | null;
  isLoading: boolean;
  hasPermission: (permission: keyof RBACPermissions) => boolean;
}

/**
 * Hook to get patient-related permissions based on current user role
 * Uses NextAuth session to determine role and returns permissions object
 * 
 * @returns {UsePatientPermissionsReturn} Object with permissions, role, loading state, and helper function
 */
export function usePatientPermissions(): UsePatientPermissionsReturn {
  const { data: session, status } = useSession();

  const result = useMemo(() => {
    // Loading state
    if (status === 'loading') {
      return {
        permissions: null,
        role: null,
        isLoading: true,
        hasPermission: () => false,
      };
    }

    // Not authenticated
    if (status === 'unauthenticated' || !session?.user) {
      return {
        permissions: null,
        role: null,
        isLoading: false,
        hasPermission: () => false,
      };
    }

    // Get role from session
    const role = (session.user as { role?: RolNombre })?.role as RolNombre | undefined;

    if (!role || !['ADMIN', 'ODONT', 'RECEP'].includes(role)) {
      return {
        permissions: null,
        role: null,
        isLoading: false,
        hasPermission: () => false,
      };
    }

    // Get permissions for role
    const permissions = getPermissions(role);

    return {
      permissions,
      role,
      isLoading: false,
      hasPermission: (permission: keyof RBACPermissions) => {
        return permissions[permission] ?? false;
      },
    };
  }, [session, status]);

  return result;
}

