// Patient quick actions panel - fast access to common tasks

'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Stethoscope, Calendar, FileText, Activity, Image } from 'lucide-react';
import Link from 'next/link';
import type { RolNombre } from '@/types/patient';

interface PatientQuickActionsProps {
  patientId: number;
  currentRole: RolNombre;
}

export function PatientQuickActions({ patientId, currentRole }: PatientQuickActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Only show for clinical roles
  if (currentRole === 'RECEP') {
    return null;
  }

  // Handle tab navigation within current page
  const handleTabNavigation = (tab: string) => {
    setIsOpen(false); // Close dropdown
    router.push(`${pathname}?tab=${tab}`, { scroll: false });
    // Scroll to top of tabs section for better UX
    setTimeout(() => {
      const tabsElement = document.querySelector('[data-slot="tabs"]');
      tabsElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

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
            <Link href={`/pacientes/${patientId}/consulta/nueva`} className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              Nueva Consulta
            </Link>
          </DropdownMenuItem>
          
          <DropdownMenuItem asChild>
            <Link href={`/citas/nueva?pacienteId=${patientId}`} className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Agendar Cita
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem 
            onClick={() => handleTabNavigation('odontogram')}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Activity className="h-4 w-4" />
            Ver Odontograma
          </DropdownMenuItem>

          <DropdownMenuItem 
            onClick={() => handleTabNavigation('clinical-history')}
            className="flex items-center gap-2 cursor-pointer"
          >
            <FileText className="h-4 w-4" />
            Historial Clínico
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem asChild>
            <Link href={`/pacientes/${patientId}/adjuntos`} className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Ver Adjuntos
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

