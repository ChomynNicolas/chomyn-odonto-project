// Attachment gallery component - displays clinical attachments

'use client';

import { useState } from 'react';
import { usePatientAttachments } from '@/lib/hooks/use-patient-attachments';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Image as ImageIcon, FileText,Download,  AlertCircle } from 'lucide-react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AttachmentGalleryProps {
  patientId: number;
  limit?: number;
}

const ATTACHMENT_TYPES = [
  { value: '', label: 'Todos' },
  { value: 'XRAY', label: 'Radiografías' },
  { value: 'INTRAORAL_PHOTO', label: 'Fotos Intraorales' },
  { value: 'EXTRAORAL_PHOTO', label: 'Fotos Extraorales' },
  { value: 'DOCUMENT', label: 'Documentos' },
  { value: 'PDF', label: 'PDFs' },
  { value: 'IMAGE', label: 'Imágenes' },
];

export function AttachmentGallery({ patientId, limit = 50 }: AttachmentGalleryProps) {
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedAttachment, setSelectedAttachment] = useState<number | null>(null);
  
  const { data: attachments, isLoading, error } = usePatientAttachments(patientId, {
    tipo: selectedType || undefined,
    limit,
  });

  const filteredAttachments = attachments || [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Error al cargar adjuntos</AlertDescription>
      </Alert>
    );
  }

  const getAttachmentIcon = (tipo: string) => {
    if (tipo.includes('PHOTO') || tipo === 'IMAGE' || tipo === 'XRAY') {
      return <ImageIcon className="h-8 w-8 text-muted-foreground" aria-label="Icono de imagen" />;
    }
    return <FileText className="h-8 w-8 text-muted-foreground" aria-label="Icono de documento" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <div className="space-y-4">
        {/* Filter */}
        <div className="flex items-center gap-2">
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              {ATTACHMENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="ml-auto">
            {filteredAttachments.length} archivo{filteredAttachments.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Gallery Grid */}
        {filteredAttachments.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-sm text-muted-foreground text-center">
                No hay adjuntos registrados.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredAttachments.map((attachment) => (
              <Card
                key={attachment.id}
                className="group cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => setSelectedAttachment(attachment.id)}
              >
                <CardContent className="p-4">
                  <div className="aspect-square flex items-center justify-center bg-muted rounded-lg mb-2 relative">
                    {attachment.tipo.includes('PHOTO') || attachment.tipo === 'IMAGE' || attachment.tipo === 'XRAY' ? (
                      <Image
                        src={attachment.secureUrl}
                        alt={attachment.descripcion || 'Adjunto clínico'}
                        fill
                        className="object-cover rounded-lg"
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                    ) : (
                      getAttachmentIcon(attachment.tipo)
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium line-clamp-1">
                      {attachment.descripcion || attachment.originalFilename || 'Sin descripción'}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {attachment.tipo}
                      </Badge>
                      <span>{formatFileSize(attachment.bytes)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={selectedAttachment !== null} onOpenChange={() => setSelectedAttachment(null)}>
        <DialogContent className="max-w-4xl">
          {selectedAttachment && (() => {
            const attachment = filteredAttachments.find(a => a.id === selectedAttachment);
            if (!attachment) return null;
            
            return (
              <>
                <DialogHeader>
                  <DialogTitle>{attachment.descripcion || attachment.originalFilename || 'Adjunto'}</DialogTitle>
                  <DialogDescription>
                    {attachment.tipo} • {formatFileSize(attachment.bytes)} • {new Date(attachment.createdAt).toLocaleDateString('es-PY')}
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4">
                  {(attachment.tipo.includes('PHOTO') || attachment.tipo === 'IMAGE' || attachment.tipo === 'XRAY') ? (
                    <div className="relative w-full aspect-auto">
                      <Image
                        src={attachment.secureUrl}
                        alt={attachment.descripcion || 'Adjunto clínico'}
                        width={800}
                        height={600}
                        className="w-full h-auto rounded-lg"
                        sizes="(max-width: 768px) 100vw, 800px"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 bg-muted rounded-lg">
                      <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                      <Button asChild>
                        <a href={attachment.secureUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-2" />
                          Descargar archivo
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}

