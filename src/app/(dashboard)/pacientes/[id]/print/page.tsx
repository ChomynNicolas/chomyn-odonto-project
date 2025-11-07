// src/app/pacientes/[id]/print/page.tsx
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import "./print.css"
import { auth } from "@/auth"
import { assertCanPrintPatient } from "@/lib/access/patients"
import { auditPatientPrint } from "@/lib/audit/log"
import { getPrintablePatientData } from "@/lib/services/patients/getPrintablePatientData"
import { formatDate, formatGender } from "@/lib/utils/patient-helpers"

// ✅ Evitar caché y forzar ejecución server-side (Node, por Prisma)
export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"
export const runtime = "nodejs"

export default async function PatientPrintPage({ params }: { params: { id: string } }) {
  const patientId = Number(params.id)
  if (!Number.isFinite(patientId)) {
    redirect("/pacientes") // id inválido
  }

  // 1) Autenticación
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  const user = {
    id: Number(session.user.id),
    role: (session.user as any).rolNombre || "RECEP",
  } as const

  // 2) Verificación de acceso y permisos
  const decision = await assertCanPrintPatient(user, patientId)

  // 3) Obtener DTO imprimible (respetando scope FULL/LIMITED)
  const dto = await getPrintablePatientData(patientId, { scope: decision.scope })

  // 4) Auditoría (segura, sin romper UX)
  await auditPatientPrint({
    actorId: user.id,
    entityId: patientId,
    headers: headers(),
    path: `/pacientes/${patientId}/print`,
    metadata: { scope: decision.scope }, // NO datos clínicos
  })

  // 5) Render A4 (sin interactividad)
  const demo = dto.patient.demographics
  const fullName = demo.fullName
  const ageStr =
    demo.birthDate && typeof demo.age === "number"
      ? `${formatDate(demo.birthDate)} (${demo.age} años)`
      : "—"
  const genderStr = demo.gender ? formatGender(demo.gender as any) : "No especificado"

  const primaryPhone = demo.contacts.primaryPhone?.valueNorm
  const primaryEmail = demo.contacts.primaryEmail?.valueNorm

  const hasAllergies = dto.allergies.length > 0
  const hasDiagnoses = dto.diagnoses.length > 0
  const hasMedications = dto.medications.length > 0
  const vital = dto.vitalSigns
  const plan = dto.treatmentPlan
  const hasAppointments = dto.appointments.length > 0

  return (
    <div className="print-layout">
      

      {/* Header */}
      <header className="section" style={{ borderBottom: "2px solid #1f2937", paddingBottom: 12 }}>
        <div className="row">
          <div>
            <h1>Chomyn Odontología</h1>
            <p className="muted small">Ficha Clínica del Paciente</p>
          </div>
          <div className="small" style={{ textAlign: "right" }}>
            <div>Fecha de impresión:</div>
            <div style={{ fontWeight: 600 }}>{formatDate(new Date().toISOString(), true)}</div>
          </div>
        </div>
      </header>

      {/* Datos del Paciente */}
      <section className="section no-break-inside">
        <h2>Información del Paciente</h2>
        <div className="grid-2" style={{ marginTop: 8 }}>
          <div>
            <div className="small muted">Nombre Completo</div>
            <div style={{ fontWeight: 600 }}>{fullName}</div>
          </div>
          <div>
            <div className="small muted">Fecha de Nacimiento / Edad</div>
            <div style={{ fontWeight: 600 }}>{ageStr}</div>
          </div>
          <div>
            <div className="small muted">Género</div>
            <div style={{ fontWeight: 600 }}>{genderStr}</div>
          </div>
          <div>
            <div className="small muted">Documento</div>
            <div style={{ fontWeight: 600 }}>
              {demo.document
                ? `${demo.document.tipo} ${demo.document.numero}${demo.document.paisEmision ? ` (${demo.document.paisEmision})` : ""}`
                : "—"}
            </div>
          </div>
          <div className="no-break-inside">
            <div className="small muted">Dirección</div>
            <div style={{ fontWeight: 600 }}>
              {demo.address ?? "—"}
            </div>
          </div>
          <div>
            <div className="small muted">Teléfono / Email</div>
            <div className="small">
              <span style={{ fontWeight: 600 }}>{primaryPhone ?? "—"}</span>
              {" · "}
              <span style={{ fontWeight: 600 }}>{primaryEmail ?? "—"}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Alergias (sección crítica) */}
      {hasAllergies && (
        <section className="section no-break-inside">
          <h2>⚠ Alergias</h2>
          <div className="danger-box" style={{ marginTop: 8 }}>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {dto.allergies.map((a) => (
                <li key={a.id} style={{ fontWeight: 600, marginBottom: 4 }}>
                  {(a.catalogName || a.label) ?? "Alergia"} — {a.severity}
                  {a.reaction ? ` (${a.reaction})` : ""}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Diagnósticos activos */}
      {hasDiagnoses && (
        <section className="section no-break-inside">
          <h2>Diagnósticos Activos</h2>
          <table className="table" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Diagnóstico</th>
                <th>Código</th>
                <th>Fecha</th>
                <th className="small">Notas</th>
              </tr>
            </thead>
            <tbody>
              {dto.diagnoses.map((d) => (
                <tr key={d.id}>
                  <td><strong>{d.catalogName ?? d.label}</strong></td>
                  <td>{d.code ?? "—"}</td>
                  <td>{formatDate(d.notedAt)}</td>
                  <td className="small">{d.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Medicación activa */}
      {hasMedications && (
        <section className="section no-break-inside">
          <h2>Medicación Activa</h2>
          <table className="table" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Medicamento</th>
                <th>Dosis</th>
                <th>Frecuencia</th>
                <th>Vía</th>
                <th>Desde</th>
                <th>Hasta</th>
              </tr>
            </thead>
            <tbody>
              {dto.medications.map((m) => (
                <tr key={m.id}>
                  <td><strong>{m.catalogName ?? m.label ?? "—"}</strong></td>
                  <td>{m.dose ?? "—"}</td>
                  <td>{m.freq ?? "—"}</td>
                  <td>{m.route ?? "—"}</td>
                  <td>{m.startAt ? formatDate(m.startAt) : "—"}</td>
                  <td>{m.endAt ? formatDate(m.endAt) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Signos vitales recientes */}
      {vital && (
        <section className="section no-break-inside">
          <h2>Signos Vitales Recientes</h2>
          <div className="small muted" style={{ marginTop: 6 }}>
            Registrado: {formatDate(vital.measuredAt, true)}
          </div>
          <div className="grid-4" style={{ marginTop: 8 }}>
            {"heightCm" in vital && vital.heightCm != null && (
              <div>
                <div className="small muted">Altura</div>
                <div style={{ fontWeight: 600 }}>{vital.heightCm} cm</div>
              </div>
            )}
            {"weightKg" in vital && vital.weightKg != null && (
              <div>
                <div className="small muted">Peso</div>
                <div style={{ fontWeight: 600 }}>{vital.weightKg} kg</div>
              </div>
            )}
            {"bmi" in vital && vital.bmi != null && (
              <div>
                <div className="small muted">IMC</div>
                <div style={{ fontWeight: 600 }}>{vital.bmi}</div>
              </div>
            )}
            {vital.bpSyst != null && vital.bpDiast != null && (
              <div>
                <div className="small muted">TA</div>
                <div style={{ fontWeight: 600 }}>
                  {vital.bpSyst}/{vital.bpDiast} mmHg
                </div>
              </div>
            )}
            {vital.heartRate != null && (
              <div>
                <div className="small muted">FC</div>
                <div style={{ fontWeight: 600 }}>{vital.heartRate} lpm</div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Plan de tratamiento activo */}
      {plan && (
        <section className="section no-break-inside">
          <h2>Plan de Tratamiento Activo</h2>
          <div className="small" style={{ marginTop: 6, fontWeight: 600 }}>{plan.title}</div>
          {plan.description && (
            <div className="small muted" style={{ marginTop: 2 }}>{plan.description}</div>
          )}
          <table className="table" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Procedimiento</th>
                <th>Diente</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {plan.steps.map((s) => (
                <tr key={s.id}>
                  <td>{s.order}</td>
                  <td>{s.procedureName ?? s.serviceType ?? "—"}</td>
                  <td>{s.toothNumber ?? "—"}</td>
                  <td>{s.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Últimas 5 citas */}
      {hasAppointments && (
        <section className="section no-break-inside">
          <h2>Últimas Citas</h2>
          <table className="table" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Profesional</th>
                <th>Consultorio</th>
                <th>Motivo</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {dto.appointments.map((c) => (
                <tr key={c.id}>
                  <td>{formatDate(c.scheduledAt, true)}</td>
                  <td>{`${c.professional.firstName} ${c.professional.lastName}`}</td>
                  <td>{c.consultorioName ?? "—"}</td>
                  <td>{c.reason ?? "—"}</td>
                  <td>{c.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Footer */}
      <footer className="section small" style={{ borderTop: "1px solid #e5e7eb", paddingTop: 8, textAlign: "center" }}>
        <div>Este documento es confidencial y contiene información médica protegida.</div>
        <div className="muted" style={{ marginTop: 2 }}>Chomyn Odontología • {new Date().getFullYear()}</div>
      </footer>
    </div>
  )
}
