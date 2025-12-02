import { NextRequest } from "next/server";
import { requireRole } from "@/app/api/pacientes/_rbac";
import { getResponsiblePartyForSurgery } from "@/lib/services/surgery-consent-validator";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { errors, ok } from "../../_http";

const QuerySchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
});

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireRole(["ADMIN", "ODONT", "RECEP"]);
  if (!gate.ok) return errors.forbidden();

  const { id } = await ctx.params;
  const pacienteId = Number(id);
  if (isNaN(pacienteId) || pacienteId <= 0) {
    return errors.validation("ID de paciente inválido.");
  }

  const parsedQuery = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsedQuery.success) {
    return errors.validation("Parámetros de consulta inválidos.", parsedQuery.error.flatten());
  }
  const { fecha } = parsedQuery.data;
  const inicio = new Date(`${fecha}T00:00:00Z`); // Use start of day for validation
  const fin = new Date(`${fecha}T23:59:59Z`); // End of day

  try {
    // Find appointments for this patient on this date
    const citas = await prisma.cita.findMany({
      where: {
        pacienteId,
        inicio: {
          gte: inicio,
          lte: fin,
        },
      },
      include: {
        Consulta: {
          include: {
            procedimientos: {
              include: {
                catalogo: {
                  select: {
                    esCirugia: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Check if any appointment has surgical procedures
    const hasSurgicalProcedures = citas.some((cita) => {
      if (!cita.Consulta || !Array.isArray(cita.Consulta)) return false
      return cita.Consulta.some((consulta) =>
        consulta.procedimientos?.some((proc: { catalogo: { esCirugia: boolean } | null }) => proc.catalogo?.esCirugia)
      )
    })

    if (!hasSurgicalProcedures) {
      return ok({
        hasValidSurgeryConsent: true,
        requiresSurgeryConsent: false,
        message: "No se requieren procedimientos quirúrgicos para esta fecha",
        responsiblePartyId: undefined,
        isPatientSelfResponsible: undefined,
      });
    }

    // Get responsible party information
    let responsiblePartyId: number | undefined;
    let isPatientSelf: boolean | undefined;
    
    try {
      const responsibleInfo = await getResponsiblePartyForSurgery(pacienteId, inicio);
      if (responsibleInfo) {
        responsiblePartyId = responsibleInfo.responsiblePartyId;
        isPatientSelf = !responsibleInfo.isMinor;
      }
    } catch {
      // If we can't determine responsible party, it's likely an error case
      // but we still want to return the consent validation result
    }

    // Check for valid surgery consent
    // Query consents that are not expired (vigente_hasta >= inicio)
    // Note: vigente_hasta is DateTime (not nullable in schema), so we only check for future dates
    const consentimientos = await prisma.consentimiento.findMany({
      where: {
        Paciente_idPaciente: pacienteId,
        tipo: "CIRUGIA",
        activo: true,
        firmado_en: { lte: inicio },
        vigente_hasta: { gte: inicio },
      },
      orderBy: { firmado_en: "desc" },
      take: 1,
    });

    const hasValidConsent = consentimientos.length > 0;

    return ok({
      hasValidSurgeryConsent: hasValidConsent,
      requiresSurgeryConsent: true,
      message: hasValidConsent
        ? "Consentimiento de cirugía vigente"
        : "Se requiere consentimiento de cirugía para procedimientos quirúrgicos",
      responsiblePartyId: responsiblePartyId,
      isPatientSelfResponsible: isPatientSelf,
    });
  } catch (e) {
    return errors.internal(e instanceof Error ? e.message : "Error al verificar consentimiento de cirugía.");
  }
}