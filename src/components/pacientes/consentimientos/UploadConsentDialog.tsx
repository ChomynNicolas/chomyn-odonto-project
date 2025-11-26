"use client";

import type React from "react";
import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle,
  User,
  Users,
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { ResponsableSelector } from "./ResponsableSelector";
import {
  type PatientInfo,
  type ConsentType,
  type ConsentWorkflowState,
  getConsentWorkflow,
  validateSignatureDate,
  getTodayDateString,
  isMinor,
} from "./types";

// Schema definitions
const baseUploadSchema = z.object({
  responsablePersonaId: z.number().min(1, "Responsable requerido"),
  firmadoEn: z
    .string()
    .min(1, "Fecha requerida")
    .refine(
      (date) => validateSignatureDate(date) === null,
      { message: "Fecha inválida" }
    ),
  observaciones: z.string().optional(),
  file: z.instanceof(File, { message: "Selecciona archivo" }),
  tipo: z.enum(["CONSENTIMIENTO_MENOR_ATENCION", "CIRUGIA"]),
});

const createUploadSchema = (
  workflow: Pick<ConsentWorkflowState, "requiresGuardian" | "canSelfSign">
) => {
  return baseUploadSchema.refine(
    (data) => {
      if (
        workflow.requiresGuardian &&
        (!data.responsablePersonaId || data.responsablePersonaId <= 0)
      ) {
        return false;
      }
      return true;
    },
    {
      message: workflow.requiresGuardian
        ? "Selecciona responsable"
        : "Responsable requerido",
      path: ["responsablePersonaId"],
    }
  );
};

type UploadFormData = z.infer<typeof baseUploadSchema>;

interface UploadConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pacienteId: number;
  patientInfo?: PatientInfo;
  citaId?: number;
  onSuccess: () => void;
  consentType?: ConsentType;
}

export function UploadConsentDialog({
  open,
  onOpenChange,
  pacienteId,
  patientInfo,
  citaId,
  onSuccess,
  consentType = "CONSENTIMIENTO_MENOR_ATENCION",
}: UploadConsentDialogProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPatientInfo, setLoadingPatientInfo] = useState(false);
  const [currentPatientInfo, setCurrentPatientInfo] = useState<PatientInfo | null>(
    patientInfo || null
  );

  const workflow = useMemo(() => {
    if (!currentPatientInfo) {
      return { isMinor: false, requiresGuardian: false, canSelfSign: true };
    }
    return getConsentWorkflow(currentPatientInfo, consentType);
  }, [currentPatientInfo, consentType]);

  const uploadSchema = useMemo(() => createUploadSchema(workflow), [workflow]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      tipo: consentType as "CONSENTIMIENTO_MENOR_ATENCION" | "CIRUGIA",
      firmadoEn: getTodayDateString(),
      responsablePersonaId:
        workflow.canSelfSign && currentPatientInfo && consentType === "CIRUGIA"
          ? currentPatientInfo.personaId
          : 1,
    },
  });

  const responsableId = watch("responsablePersonaId");
  const firmadoEn = watch("firmadoEn");

  // Load patient info if not provided
  useEffect(() => {
    if (!patientInfo && open) {
      setLoadingPatientInfo(true);
      fetch(`/api/pacientes/${pacienteId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.ok && data.data?.persona) {
            const persona = data.data.persona;
            const patientInfo = {
              id: pacienteId,
              personaId: persona.idPersona,
              nombres: persona.nombres,
              apellidos: persona.apellidos,
              fechaNacimiento: persona.fechaNacimiento,
              documento: persona.documento,
            };
            setCurrentPatientInfo(patientInfo);
            if (consentType === "CIRUGIA") {
              const isMinorPatient = isMinor(persona.fechaNacimiento);
              if (!isMinorPatient) setValue("responsablePersonaId", persona.idPersona);
            }
          }
        })
        .catch((error) => {
          toast.error("Error al cargar el paciente");
        })
        .finally(() => {
          setLoadingPatientInfo(false);
        });
    }
  }, [pacienteId, patientInfo, open, consentType, setValue]);

  // Auto-set responsible party for adult surgery consents
  useEffect(() => {
    if (
      workflow.canSelfSign &&
      currentPatientInfo &&
      consentType === "CIRUGIA" &&
      open
    ) {
      setValue("responsablePersonaId", currentPatientInfo.personaId, {
        shouldValidate: true,
        shouldDirty: true,
      });
      setTimeout(() => {
        const currentValue = watch("responsablePersonaId");
        if (currentValue !== currentPatientInfo.personaId) {
          setValue("responsablePersonaId", currentPatientInfo.personaId, {
            shouldValidate: true,
            shouldDirty: true,
          });
        }
      }, 100);
    }
  }, [workflow, currentPatientInfo, consentType, setValue, responsableId, watch, open]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      reset({
        tipo: consentType as "CONSENTIMIENTO_MENOR_ATENCION" | "CIRUGIA",
        firmadoEn: getTodayDateString(),
        responsablePersonaId:
          workflow.canSelfSign && currentPatientInfo && consentType === "CIRUGIA"
            ? currentPatientInfo.personaId
            : 1,
      });
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  }, [open, consentType, workflow, currentPatientInfo, reset]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Validate
    const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      toast.error("Solo PDF, PNG o JPEG");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Máx. 10MB");
      return;
    }
    setSelectedFile(file);
    setValue("file", file);
    // Preview image
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const onSubmit = async (data: UploadFormData) => {
    if (
      workflow.canSelfSign &&
      currentPatientInfo &&
      consentType === "CIRUGIA" &&
      data.responsablePersonaId !== currentPatientInfo.personaId
    ) {
      data.responsablePersonaId = currentPatientInfo.personaId;
    }
    setUploading(true);
    try {
      // Cloudinary sign
      const fileType = data.file.type;
      let adjuntoTipo: "PDF" | "DOCUMENT" | "IMAGE" = "DOCUMENT";
      if (fileType === "application/pdf") adjuntoTipo = "PDF";
      else if (fileType.startsWith("image/")) adjuntoTipo = "IMAGE";
      const signRes = await fetch("/api/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pacienteId,
          tipo: adjuntoTipo,
          accessMode: "AUTHENTICATED",
        }),
      });
      const signData = await signRes.json();
      if (!signRes.ok || !signData.ok) throw new Error(signData.error || "Error firma upload");
      const { signature, cloudName, apiKey, folder, timestamp } = signData.data;
      // Upload to Cloudinary
      const formData = new FormData();
      formData.append("file", data.file);
      formData.append("api_key", apiKey);
      formData.append("timestamp", String(timestamp));
      formData.append("signature", signature);
      formData.append("folder", folder);
      formData.append("access_mode", "authenticated");
      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
        { method: "POST", body: formData }
      );
      const uploadResult = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadResult.error?.message || "Error subida");
      // Register consent
      const consentPayload = {
        responsablePersonaId: data.responsablePersonaId,
        tipo: data.tipo,
        firmadoEn: new Date(data.firmadoEn).toISOString(),
        ...(data.tipo !== "CIRUGIA" && { vigenciaEnMeses: 12 }),
        citaId: citaId ?? null,
        observaciones: data.observaciones || null,
        cloudinary: {
          publicId: uploadResult.public_id,
          secureUrl: uploadResult.secure_url,
          format: uploadResult.format,
          bytes: uploadResult.bytes,
          width: uploadResult.width,
          height: uploadResult.height,
          hash: uploadResult.etag,
        },
      };
      const consentRes = await fetch(
        `/api/pacientes/${pacienteId}/consentimiento`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(consentPayload),
        }
      );
      const consentData = await consentRes.json();
      if (!consentRes.ok || !consentData.ok) {
        const errorMsg =
          consentData.error ||
          consentData.message ||
          "Error al registrar el consentimiento";
        toast.error("Error", { description: errorMsg });
        throw new Error(errorMsg);
      }
      toast.success("Consentimiento registrado");
      reset();
      setSelectedFile(null);
      setPreviewUrl(null);
      onSuccess();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error al subir consentimiento";
      toast.error(errorMessage, { duration: 6000 });
    } finally {
      setUploading(false);
    }
  };

  // Loading state
  if (loadingPatientInfo) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin mr-3" />
          <span>Cargando paciente...</span>
        </DialogContent>
      </Dialog>
    );
  }

  if (!currentPatientInfo) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No se pudo cargar el paciente.
            </AlertDescription>
          </Alert>
        </DialogContent>
      </Dialog>
    );
  }

  // --- UI Layout + Structure Improvements ---

  // 1. Sticky Action Bar: 
  //    Keep footer actions pinned to bottom (max-w-lg); modal content scrollable.

  // 2. Reduce vertical space: 
  //    Use grouped form sections; minimal labels; concise copy.

  // 3. File upload preview and filename inline, status icon with removal possibility.

  // 4. Modal content: Scrollable area with max-h (responsive); actions always visible.

  // 5. Use consistent spacing; align labels/intputs horizontally when possible.

  // 6. Responsive: On small screens, content scrolls, footer always pinned.

  // 7. Remove redundant copy and clarification.

  // --- End UI Layout Recommendations ---

  const patientName = `${currentPatientInfo.nombres} ${currentPatientInfo.apellidos}`.trim();
  const consentIsSurgery = consentType === "CIRUGIA";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg p-0 sm:p-0 flex flex-col"
        style={{ maxHeight: "80vh", overflow: "hidden" }}
      >
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            {workflow.canSelfSign ? (
              <User className="h-5 w-5" />
            ) : (
              <Users className="h-5 w-5" />
            )}
            {consentIsSurgery
              ? workflow.canSelfSign
                ? "Consentimiento cirugía"
                : "Consentimiento cirugía (responsable)"
              : workflow.requiresGuardian
              ? "Consentimiento (responsable)"
              : "Consentimiento informado"}
          </DialogTitle>
          <DialogDescription className="text-sm mt-1">
            {consentIsSurgery
              ? workflow.canSelfSign
                ? `Sube el consentimiento de cirugía firmado por ${patientName}.`
                : `Sube consentimiento de cirugía firmado por el responsable legal de ${patientName}.`
              : workflow.requiresGuardian
              ? `Consentimiento firmado por el responsable legal de ${patientName}.`
              : `Consentimiento firmado por ${patientName}.`}
          </DialogDescription>
        </DialogHeader>
        <div
          className="flex-1 overflow-y-auto px-6 pt-2 pb-1 space-y-4"
          style={{ minHeight: 0 }}
        >
          {/* Patient Info Card */}
          <div className="bg-muted/30 border rounded p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">
                {patientName}
              </span>
            </div>
            <div className="text-xs text-muted-foreground space-x-2">
              <span>
                <strong>Edad:</strong>{" "}
                {workflow.isMinor ? "Menor" : "Adulto"}
              </span>
              {consentIsSurgery && (
                <span className="pl-2">
                  <strong>Cita:</strong>{" "}
                  {citaId ? "Asociada" : "Específica"}
                </span>
              )}
            </div>
          </div>
          {/* Responsible Selector */}
          {workflow.requiresGuardian && (
            <div>
              <Label className="flex items-center gap-2 text-sm mb-1">
                <Users className="h-4 w-4" />
                Responsable legal
              </Label>
              <div className="flex items-center gap-2">
                <ResponsableSelector
                  pacienteId={pacienteId}
                  value={responsableId}
                  onChange={(id) => setValue("responsablePersonaId", id)}
                  allowSelfForSurgery={false}
                />
                {errors.responsablePersonaId && (
                  <span className="ml-2 text-xs text-destructive">
                    {errors.responsablePersonaId.message}
                  </span>
                )}
              </div>
            </div>
          )}
          {/* Signature Date */}
          <div className="flex flex-wrap gap-3 items-center">
            <Label
              htmlFor="firmadoEn"
              className="text-sm font-medium min-w-[110px]"
            >
              Fecha firma
            </Label>
            <Input
              id="firmadoEn"
              type="date"
              className="max-w-[170px] text-sm"
              {...register("firmadoEn")}
              max={getTodayDateString()}
              />
            {errors.firmadoEn && (
              <span className="ml-2 text-xs text-destructive">
                {errors.firmadoEn.message}
              </span>
            )}
          </div>
          {/* File Upload */}
          <div>
            <Label htmlFor="file" className="text-sm font-medium">
              Documento firmado
            </Label>
            <div className="flex items-center flex-wrap gap-3 pt-1">
              <Input
                id="file"
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/jpg"
                onChange={handleFileChange}
                className="max-w-[220px] cursor-pointer text-sm"
              />
              {selectedFile && (
                <Alert className="py-1 px-2 flex items-center gap-2 border-l-4 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 w-auto">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <span className="truncate text-xs text-emerald-800 dark:text-emerald-200">
                    {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)}MB)
                  </span>
                  {selectedFile.type === "application/pdf" && (
                    <FileText className="h-5 w-5 text-red-400" />
                  )}
                </Alert>
              )}
              {errors.file && (
                <span className="ml-2 text-xs text-destructive">
                  {errors.file.message}
                </span>
              )}
            </div>
            {previewUrl && (
              <div className="relative h-32 w-full mt-2 overflow-hidden rounded border">
                <Image
                  src={previewUrl}
                  alt="Preview"
                  fill
                  className="object-contain"
                  sizes="(max-width: 640px) 100vw, 300px"
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              PDF, PNG, JPEG · máx. 10MB
            </p>
          </div>
          {/* Optional Notes */}
          <div className="space-y-1">
            <Label htmlFor="observaciones" className="text-sm font-medium">
              Observaciones (opcional)
            </Label>
            <Textarea
              id="observaciones"
              {...register("observaciones")}
              rows={2}
              placeholder="Agrega información adicional..."
              className="resize-none text-sm"
            />
          </div>
          {/* Consent Info */}
          <Alert className="text-xs py-2 px-3 border-l-4 border-blue-400 bg-blue-50 dark:bg-blue-950/30">
            <AlertCircle className="h-4 w-4 mr-2" />
            <AlertDescription>
              {consentIsSurgery
                ? "Válido solo para la cita quirúrgica asociada."
                : workflow.requiresGuardian
                ? "Vigencia: 12 meses. Permite atención del menor."
                : "Vigencia: 12 meses. Permite atención del paciente."}
            </AlertDescription>
          </Alert>
        </div>
        {/* Sticky footer: Buttons always visible, shadow for separation */}
        <DialogFooter className="sticky bottom-0 bg-white dark:bg-neutral-900 z-10 px-6 py-3 border-t shadow-sm flex space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
            className="w-32"
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={uploading} className="flex-1" form="form-consent-upload">
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" /> Subir
              </>
            )}
          </Button>
        </DialogFooter>
        {/* Form outside content for sticky footer consistency */}
        <form
          id="form-consent-upload"
          onSubmit={handleSubmit(onSubmit)}
          className="hidden"
        />
      </DialogContent>
    </Dialog>
  );
}
