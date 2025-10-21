"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Label from "../form/Label";
import Button from "../ui/button/Button";
import Modal from "../ui/modal";
import { pacienteQuickCreateSchema, type PacienteQuickCreateDTO } from "@/lib/schema/paciente.quick";
import { useCreatePacienteQuick } from "@/hooks/useCreatePacienteQuick";

type QuickInput = PacienteQuickCreateDTO;

export default function PatientQuickCreateModal({
  open, onClose, onCreated,
  // 👇 recibe del padre el estado de filtro actual para optimizar el cache update
  qForList = "", soloActivos = true, limit = 20,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
  qForList?: string;
  soloActivos?: boolean;
  limit?: number;
}) {
  const [apiError, setApiError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<QuickInput>({
    resolver: zodResolver(pacienteQuickCreateSchema),
    defaultValues: { nombreCompleto: "", genero: "NO_ESPECIFICADO", dni: "", telefono: "", email: "" as any },
    mode: "onBlur",
  });

  const mutation = useCreatePacienteQuick({ qForList, soloActivos, limit });

  const submit = async (values: QuickInput) => {
    setApiError(null);
    try {
      const resp = await mutation.mutateAsync(values);
      // resp ya actualizó optimist/invalidate. Dispara banner:
      if (resp.ok) {
        onCreated(String(resp.data.item.idPaciente));
        reset();
        onClose();
      }
    } catch (err: any) {
      setApiError(err.message || "Error inesperado");
    }
  };

  const ready = !!watch("nombreCompleto") && !!watch("dni") && !!watch("telefono") && !!watch("genero");

  return (
    <Modal open={open} onClose={onClose} title="Alta rápida de paciente" maxWidthClass="max-w-xl">
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        {apiError && (
          <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
            {apiError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="qr-nombre">Nombre completo *</Label>
            <input id="qr-nombre" {...register("nombreCompleto")} autoFocus
              className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900" />
            {errors.nombreCompleto && <p className="mt-1 text-theme-xs text-error-600">{errors.nombreCompleto.message}</p>}
          </div>

          <div>
            <Label htmlFor="qr-genero">Género *</Label>
            <select id="qr-genero" {...register("genero")}
              className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900">
              {["MASCULINO","FEMENINO","OTRO","NO_ESPECIFICADO"].map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            {errors.genero && <p className="mt-1 text-theme-xs text-error-600">{errors.genero.message}</p>}
          </div>

          <div>
            <Label htmlFor="qr-dni">DNI/Cédula *</Label>
            <input id="qr-dni" {...register("dni")}
              className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900" />
            {errors.dni && <p className="mt-1 text-theme-xs text-error-600">{errors.dni.message}</p>}
          </div>

          <div>
            <Label htmlFor="qr-telefono">Teléfono *</Label>
            <input id="qr-telefono" {...register("telefono")} inputMode="tel" placeholder="+59599123456"
              className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900" />
            {errors.telefono && <p className="mt-1 text-theme-xs text-error-600">{errors.telefono.message}</p>}
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="qr-email">Email (opcional)</Label>
            <input id="qr-email" type="email" placeholder="correo@dominio.com" {...register("email")}
              className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900" />
            {errors.email && <p className="mt-1 text-theme-xs text-error-600">{errors.email.message}</p>}
            <p className="mt-1 text-xs text-muted-foreground">Si no dispone ahora, puede completarse luego en la ficha.</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose}
            className="rounded-md border border-gray-200 px-4 py-2 text-sm text-foreground hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5">
            Cancelar
          </button>
          <Button disabled={mutation.isPending || !ready} className="bg-brand-500 hover:bg-brand-600">
            {mutation.isPending ? "Guardando..." : "Crear"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
