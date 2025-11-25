// Odontogram modal component - fullscreen view with history sidebar
// Displays odontogram in a spacious modal with optional history panel

'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { History, AlertCircle, X, ChevronLeft, ChevronRight, User, Calendar, FileText } from 'lucide-react';
import { OdontogramViewer } from './OdontogramViewer';
import { usePatientOdontogramHistory } from '@/lib/hooks/use-patient-odontogram-history';
import { formatShortDate } from '@/lib/utils/date-formatters';
import { cn } from '@/lib/utils';
import type { OdontogramSnapshotAPI } from '@/lib/types/patient';

interface OdontogramModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: number;
  initialSnapshotId?: number; // Optional: start with specific snapshot
  showHistory?: boolean; // Toggle history panel
}

/**
 * OdontogramModal - Fullscreen modal for viewing odontogram with history
 * 
 * Features:
 * - Near-fullscreen layout (95% viewport) for maximum visibility
 * - Collapsible history sidebar for better space utilization
 * - Compact header with essential metadata
 * - Responsive design (mobile-first)
 * - Keyboard shortcuts (ESC to close, arrow keys to navigate)
 * - Focus management for accessibility
 * - Smooth animations and transitions
 */
export function OdontogramModal({
  isOpen,
  onClose,
  patientId,
  initialSnapshotId,
  showHistory = true,
}: OdontogramModalProps) {
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<number | undefined>(initialSnapshotId);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const modalRef = useRef<HTMLDivElement>(null);

  // Fetch odontogram history
  const { data: historyData, isLoading, error, refetch } = usePatientOdontogramHistory(patientId, {
    limit: 50,
    offset: 0,
    enabled: isOpen, // Only fetch when modal is open
  });

  // Get selected snapshot or most recent
  const selectedSnapshot = useMemo<OdontogramSnapshotAPI | undefined>(() => {
    if (!historyData?.snapshots) return undefined;
    
    if (selectedSnapshotId !== undefined) {
      return historyData.snapshots.find((s) => s.id === selectedSnapshotId);
    }
    
    // Default to most recent (first in array, already sorted desc)
    return historyData.snapshots[0];
  }, [historyData, selectedSnapshotId]);

  // Navigate between snapshots
  const currentIndex = useMemo(() => {
    if (!historyData?.snapshots || !selectedSnapshotId) return -1;
    return historyData.snapshots.findIndex((s) => s.id === selectedSnapshotId);
  }, [historyData, selectedSnapshotId]);

  const handleSnapshotSelect = (snapshotId: number) => {
    setSelectedSnapshotId(snapshotId);
    // Auto-close sidebar on mobile after selection
    if (window.innerWidth < 768) {
      setIsHistoryOpen(false);
    }
  };

  const handlePrev = useCallback(() => {
    if (!historyData?.snapshots || currentIndex <= 0) return;
    setSelectedSnapshotId(historyData.snapshots[currentIndex - 1].id);
  }, [historyData, currentIndex]);

  const handleNext = useCallback(() => {
    if (!historyData?.snapshots || currentIndex >= historyData.snapshots.length - 1) return;
    setSelectedSnapshotId(historyData.snapshots[currentIndex + 1].id);
  }, [historyData, currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'ArrowLeft' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleNext();
      } else if ((e.key === 'h' || e.key === 'H') && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsHistoryOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handlePrev, handleNext]);

  // Focus management for accessibility
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const firstFocusable = modalRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  const sidebarWidth = isHistoryOpen ? 'w-full md:w-80 lg:w-96' : 'w-0';
  const hasMultipleSnapshots = (historyData?.snapshots.length ?? 0) > 1;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        ref={modalRef}
        showCloseButton={false}
        className={cn(
          // Override default centering and sizing - use !important via ! prefix
          '!fixed !inset-[1vh] !top-[1vh] !left-[1vw] !right-[1vw] !bottom-[1vh]',
          '!translate-x-0 !translate-y-0 !transform-none',
          '!max-w-none !w-[98vw] !h-[98vh]',
          // Override default grid layout
          '!grid-rows-none',
          // Layout - flex column instead of grid
          'flex flex-col p-0 gap-0',
          // Visual
          'rounded-lg border bg-background shadow-2xl',
          // Animation
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-100'
        )}
        style={{
          // Force override any inline styles from Radix
          top: '1vh',
          left: '1vw',
          right: '1vw',
          bottom: '1vh',
          transform: 'none',
          maxWidth: '98vw',
          width: '98vw',
          height: '98vh',
          maxHeight: '98vh',
        }}
        aria-describedby="odontogram-modal-description"
      >
        {/* Compact Header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base md:text-lg font-semibold truncate">
                Odontograma - Paciente #{patientId}
              </DialogTitle>
              {selectedSnapshot && (
                <div className="flex items-center gap-2 mt-1 text-xs md:text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3 flex-shrink-0" />
                  <span>{formatShortDate(selectedSnapshot.takenAt)}</span>
                  <Separator orientation="vertical" className="h-3" />
                  <User className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{selectedSnapshot.createdBy.name}</span>
                  {selectedSnapshot.consultaId && (
                    <>
                      <Separator orientation="vertical" className="h-3" />
                      <FileText className="h-3 w-3 flex-shrink-0" />
                      <Badge variant="secondary" className="text-xs">
                        #{selectedSnapshot.consultaId}
                      </Badge>
                    </>
                  )}
                </div>
              )}
            </div>
            {hasMultipleSnapshots && (
              <div className="flex items-center gap-1 border rounded-md p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrev}
                  disabled={currentIndex <= 0}
                  className="h-7 w-7 p-0"
                  aria-label="Odontograma anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground px-2 min-w-[3rem] text-center">
                  {currentIndex + 1} / {historyData?.snapshots.length ?? 0}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNext}
                  disabled={currentIndex >= (historyData?.snapshots.length ?? 0) - 1}
                  className="h-7 w-7 p-0"
                  aria-label="Odontograma siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 ml-2">
            {showHistory && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                className="h-8 w-8 p-0"
                aria-label={isHistoryOpen ? 'Ocultar historial' : 'Mostrar historial'}
                title="Historial (H)"
              >
                <History className={cn('h-4 w-4', isHistoryOpen && 'text-primary')} />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 min-h-0 overflow-hidden relative flex-col md:flex-row">
          {/* Odontogram Viewer - Main Content */}
          <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4 md:p-6 lg:p-8">
                {isLoading && (
                  <div className="space-y-4">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-32 w-full" />
                  </div>
                )}

                {error && (
                  <Alert variant="destructive" className="max-w-2xl mx-auto">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
                      <span>Error al cargar odontograma: {error.message}</span>
                      <Button variant="outline" size="sm" onClick={() => refetch()}>
                        Reintentar
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {!isLoading && !error && !selectedSnapshot && (
                  <Alert className="max-w-2xl mx-auto">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No hay odontogramas disponibles para este paciente.
                    </AlertDescription>
                  </Alert>
                )}

                {!isLoading && !error && selectedSnapshot && (
                  <div className="max-w-7xl mx-auto">
                    <OdontogramViewer snapshot={selectedSnapshot} showMetadata={false} />
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Collapsible History Sidebar */}
          {showHistory && (
            <div
              className={cn(
                'border-l bg-muted/20 transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0',
                sidebarWidth,
                !isHistoryOpen && 'border-0'
              )}
            >
              {isHistoryOpen && (
                <div className="flex flex-col h-full min-w-0 min-h-0">
                  <div className="p-4 border-b bg-muted/40 flex-shrink-0">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Historial de Odontogramas
                    </h3>
                    {historyData && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {historyData.total} registro{historyData.total !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <ScrollArea className="flex-1 min-h-0 overflow-hidden">
                    <div className="p-3 space-y-2">
                      {isLoading && (
                        <div className="space-y-2">
                          <Skeleton className="h-20 w-full" />
                          <Skeleton className="h-20 w-full" />
                          <Skeleton className="h-20 w-full" />
                        </div>
                      )}
                      {!isLoading && (!historyData?.snapshots || historyData.snapshots.length === 0) && (
                        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground text-center p-4">
                          No hay historial disponible
                        </div>
                      )}
                      {!isLoading &&
                        historyData?.snapshots &&
                        historyData.snapshots.map((snapshot) => (
                          <Button
                            key={snapshot.id}
                            variant={selectedSnapshot?.id === snapshot.id ? 'default' : 'outline'}
                            className={cn(
                              'w-full justify-start text-left h-auto py-3 px-3 transition-all',
                              'hover:bg-accent focus:ring-2 focus:ring-ring focus:ring-offset-2'
                            )}
                            onClick={() => handleSnapshotSelect(snapshot.id)}
                            aria-pressed={selectedSnapshot?.id === snapshot.id}
                          >
                            <div className="flex flex-col items-start gap-1 w-full">
                              <div className="flex items-center justify-between w-full">
                                <span className="font-medium text-sm">
                                  {new Date(snapshot.takenAt).toLocaleDateString('es-PY', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </span>
                                {snapshot.id === historyData.snapshots[0]?.id && (
                                  <Badge variant="secondary" className="text-xs">
                                    Actual
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground truncate w-full">
                                Por: {snapshot.createdBy.name}
                              </span>
                              {snapshot.consultaId && (
                                <Badge variant="outline" className="text-xs mt-1">
                                  Consulta #{snapshot.consultaId}
                                </Badge>
                              )}
                            </div>
                          </Button>
                        ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Keyboard Shortcuts Hint (hidden on mobile) */}
        <div className="hidden md:flex items-center justify-center gap-4 px-4 py-2 border-t bg-muted/20 text-xs text-muted-foreground">
          <span>
            <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted border rounded">←</kbd>
            <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted border rounded ml-1">→</kbd> Navegar
          </span>
          <Separator orientation="vertical" className="h-3" />
          <span>
            <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted border rounded">H</kbd> Historial
          </span>
          <Separator orientation="vertical" className="h-3" />
          <span>
            <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted border rounded">ESC</kbd> Cerrar
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

