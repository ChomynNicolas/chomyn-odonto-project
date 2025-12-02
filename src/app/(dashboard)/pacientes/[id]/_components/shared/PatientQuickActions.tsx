// Patient quick actions panel - fast access to common tasks

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import type { RolNombre } from '@/types/patient';
import type { RBACPermissions } from '@/lib/utils/rbac';

interface PatientQuickActionsProps {
  patientId: number;
  currentRole: RolNombre;
  permissions?: RBACPermissions | null;
}

export function PatientQuickActions({ patientId, currentRole }: PatientQuickActionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Only show for clinical roles
  if (currentRole === 'RECEP') {
    return null;
  }



  return (
    <div className="fixed bottom-6 right-6 z-50">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            size="lg"
            className="h-14 w-14 rounded-full shadow-lg"
            aria-label="Acciones rápidas"
            aria-haspopup="true"
            aria-expanded={isOpen}
          >
            <Plus className="h-6 w-6" aria-hidden="true" />
            <span className="sr-only">Abrir menú de acciones rápidas</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem asChild>
            <Link href={`/pacientes/${patientId}/adjuntos`} className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" aria-hidden="true" />
              Ver Adjuntos
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

