import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/app/api/pacientes/_rbac";
import { validateSurgeryConsent, getResponsiblePartyForSurgery } from "@/lib/services/surgery-consent-validator";
import { errors, ok } from "@/lib/api/server-utils";
import { z } from "zod";

const QuerySchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
});

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  const gate = await requireRole(["ADMIN", "ODONT", "RECEP"]);
  if (!gate.ok) return errors.forbidden();

  const pacienteId = Number(ctx.params.id);
  if (isNaN(pacienteId) || pacienteId <= 0) {
    return errors.validation("ID de paciente inválido.");
  }

  const parsedQuery = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsedQuery.success) {
    return errors.validation("Parámetros de consulta inválidos.", parsedQuery.error.flatten());
  }
  const { fecha } = parsedQuery.data;
  const inicio = new Date(`${fecha}T00:00:00Z`); // Use start of day for validation

  try {
    const { isValid, message } = await validateSurgeryConsent(pacienteId, inicio);
    
    let responsiblePartyId: number | undefined;
    let isPatientSelf: boolean | undefined;
    
    try {
      const responsibleInfo = await getResponsiblePartyForSurgery(pacienteId, inicio);
      responsiblePartyId = responsibleInfo.responsablePersonaId;
      isPatientSelf = responsibleInfo.isPatientSelf;
    } catch (e) {
      // If we can't determine responsible party, it's likely an error case
      // but we still want to return the consent validation result
    }

    return ok({
      hasValidSurgeryConsent: isValid,
      requiresSurgeryConsent: true, // This endpoint implies it's checking for surgery consent
      message: message,
      responsiblePartyId: responsiblePartyId,
      isPatientSelfResponsible: isPatientSelf,
    });
  } catch (e: any) {
    return errors.internal(e.message || "Error al verificar consentimiento de cirugía.");
  }
}