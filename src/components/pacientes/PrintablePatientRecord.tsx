import { formatFullName, calculateAge, formatGender } from "@/lib/utils/patient-helpers"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AlertTriangle, Activity, Pill, Stethoscope, Calendar, ClipboardList } from "lucide-react"

interface PrintablePatientRecordProps {
  data: {
    paciente: any
    allergies: any[]
    diagnoses: any[]
    medications: any[]
    vitalSigns: any | null
    treatmentPlans: any[]
  }
}

export function PrintablePatientRecord({ data }: PrintablePatientRecordProps) {
  const { paciente, allergies, diagnoses, medications, vitalSigns, treatmentPlans } = data
  const persona = paciente.persona
  const documento = persona.documento

  const fullName = formatFullName(persona.nombres, persona.apellidos, "")
  const age = persona.fechaNacimiento ? calculateAge(persona.fechaNacimiento) : null
  const gender = persona.genero ? formatGender(persona.genero) : "No especificado"

  const primaryPhone = persona.contactos.find((c: any) => c.tipo === "PHONE" && c.esPrincipal)
  const primaryEmail = persona.contactos.find((c: any) => c.tipo === "EMAIL" && c.esPrincipal)

  const activeTreatmentPlan = treatmentPlans[0]

  return (
    <div className="mx-auto max-w-[210mm] bg-white p-8 print:p-12">
      {/* Header with clinic branding */}
      <header className="mb-8 border-b pb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Chomyn Odontología</h1>
            <p className="mt-1 text-sm text-gray-600">Ficha Clínica del Paciente</p>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p>Fecha de impresión:</p>
            <p className="font-medium">
              {new Date().toLocaleDateString("es-PY", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      </header>

      {/* Patient Demographics */}
      <section className="mb-6">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900">Datos del Paciente</h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border bg-gray-50 p-4">
          <div>
            <p className="text-xs font-medium text-gray-500">Nombre Completo</p>
            <p className="text-sm font-semibold text-gray-900">{fullName}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Edad / Género</p>
            <p className="text-sm text-gray-900">
              {age ? `${age} años` : "No especificado"} • {gender}
            </p>
          </div>
          {documento && (
            <>
              <div>
                <p className="text-xs font-medium text-gray-500">Documento</p>
                <p className="text-sm text-gray-900">
                  {documento.tipo} {documento.numero} ({documento.pais})
                </p>
              </div>
              {documento.ruc && (
                <div>
                  <p className="text-xs font-medium text-gray-500">RUC</p>
                  <p className="text-sm text-gray-900">{documento.ruc}</p>
                </div>
              )}
            </>
          )}
          {persona.direccion && (
            <div className="col-span-2">
              <p className="text-xs font-medium text-gray-500">Dirección</p>
              <p className="text-sm text-gray-900">{persona.direccion}</p>
            </div>
          )}
          {primaryPhone && (
            <div>
              <p className="text-xs font-medium text-gray-500">Teléfono</p>
              <p className="text-sm text-gray-900">{primaryPhone.valorNorm}</p>
            </div>
          )}
          {primaryEmail && (
            <div>
              <p className="text-xs font-medium text-gray-500">Email</p>
              <p className="text-sm text-gray-900">{primaryEmail.valorNorm}</p>
            </div>
          )}
        </div>
      </section>

      <Separator className="my-6" />

      {/* Critical Allergies */}
      {allergies.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Alergias
          </h2>
          <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-4">
            {allergies.map((allergy) => (
              <div key={allergy.idPatientAllergy} className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900">{allergy.allergyCatalog?.name || allergy.label}</p>
                  {allergy.reaction && <p className="text-sm text-gray-600">Reacción: {allergy.reaction}</p>}
                </div>
                <Badge variant={allergy.severity === "SEVERE" ? "destructive" : "secondary"} className="text-xs">
                  {allergy.severity === "SEVERE" ? "Severa" : allergy.severity === "MODERATE" ? "Moderada" : "Leve"}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Active Diagnoses */}
      {diagnoses.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Stethoscope className="h-5 w-5 text-blue-600" />
            Diagnósticos Activos
          </h2>
          <div className="space-y-2 rounded-lg border bg-blue-50 p-4">
            {diagnoses.map((diagnosis) => (
              <div key={diagnosis.idPatientDiagnosis} className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900">{diagnosis.diagnosisCatalog?.name || diagnosis.label}</p>
                  {diagnosis.code && <p className="text-xs text-gray-600">Código: {diagnosis.code}</p>}
                  {diagnosis.notes && <p className="text-sm text-gray-600">{diagnosis.notes}</p>}
                </div>
                <p className="text-xs text-gray-500">{new Date(diagnosis.notedAt).toLocaleDateString("es-PY")}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Active Medications */}
      {medications.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Pill className="h-5 w-5 text-green-600" />
            Medicación Activa
          </h2>
          <div className="space-y-2 rounded-lg border bg-green-50 p-4">
            {medications.map((medication) => (
              <div key={medication.idPatientMedication} className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900">{medication.medicationCatalog?.name || medication.label}</p>
                  <div className="mt-1 flex gap-4 text-sm text-gray-600">
                    {medication.dose && <span>Dosis: {medication.dose}</span>}
                    {medication.freq && <span>Frecuencia: {medication.freq}</span>}
                    {medication.route && <span>Vía: {medication.route}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Vital Signs */}
      {vitalSigns && (
        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Activity className="h-5 w-5 text-purple-600" />
            Signos Vitales Recientes
          </h2>
          <div className="rounded-lg border bg-purple-50 p-4">
            <p className="mb-3 text-xs text-gray-600">
              Registrado el {new Date(vitalSigns.measuredAt).toLocaleDateString("es-PY")}
            </p>
            <div className="grid grid-cols-3 gap-4">
              {vitalSigns.heightCm && (
                <div>
                  <p className="text-xs font-medium text-gray-500">Altura</p>
                  <p className="text-sm font-semibold text-gray-900">{vitalSigns.heightCm} cm</p>
                </div>
              )}
              {vitalSigns.weightKg && (
                <div>
                  <p className="text-xs font-medium text-gray-500">Peso</p>
                  <p className="text-sm font-semibold text-gray-900">{vitalSigns.weightKg} kg</p>
                </div>
              )}
              {vitalSigns.bmi && (
                <div>
                  <p className="text-xs font-medium text-gray-500">IMC</p>
                  <p className="text-sm font-semibold text-gray-900">{vitalSigns.bmi.toFixed(1)}</p>
                </div>
              )}
              {vitalSigns.bpSyst && vitalSigns.bpDiast && (
                <div>
                  <p className="text-xs font-medium text-gray-500">Presión Arterial</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {vitalSigns.bpSyst}/{vitalSigns.bpDiast} mmHg
                  </p>
                </div>
              )}
              {vitalSigns.heartRate && (
                <div>
                  <p className="text-xs font-medium text-gray-500">Frecuencia Cardíaca</p>
                  <p className="text-sm font-semibold text-gray-900">{vitalSigns.heartRate} bpm</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Active Treatment Plan */}
      {activeTreatmentPlan && (
        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <ClipboardList className="h-5 w-5 text-orange-600" />
            Plan de Tratamiento Activo
          </h2>
          <div className="rounded-lg border bg-orange-50 p-4">
            <h3 className="mb-2 font-semibold text-gray-900">{activeTreatmentPlan.titulo}</h3>
            {activeTreatmentPlan.descripcion && (
              <p className="mb-3 text-sm text-gray-600">{activeTreatmentPlan.descripcion}</p>
            )}
            <div className="space-y-2">
              {activeTreatmentPlan.steps.map((step: any) => (
                <div
                  key={step.idTreatmentStep}
                  className="flex items-center justify-between border-l-2 border-orange-300 bg-white px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-700">
                      {step.order}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {step.procedimientoCatalogo?.nombre || step.serviceType}
                      </p>
                      {step.toothNumber && <p className="text-xs text-gray-600">Diente: {step.toothNumber}</p>}
                    </div>
                  </div>
                  <Badge variant={step.status === "COMPLETED" ? "default" : "secondary"} className="text-xs">
                    {step.status === "COMPLETED"
                      ? "Completado"
                      : step.status === "IN_PROGRESS"
                        ? "En Progreso"
                        : "Pendiente"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recent Appointments */}
      {paciente.citas.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Calendar className="h-5 w-5 text-indigo-600" />
            Últimas Citas
          </h2>
          <div className="space-y-2 rounded-lg border bg-indigo-50 p-4">
            {paciente.citas.slice(0, 5).map((cita: any) => (
              <div
                key={cita.idCita}
                className="flex items-center justify-between border-l-2 border-indigo-300 bg-white px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(cita.inicio).toLocaleDateString("es-PY", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-gray-600">
                    {cita.profesional.persona.nombres} {cita.profesional.persona.apellidos}
                    {cita.consultorio && ` • ${cita.consultorio.nombre}`}
                  </p>
                  {cita.motivo && <p className="text-xs text-gray-500">{cita.motivo}</p>}
                </div>
                <Badge variant="outline" className="text-xs">
                  {cita.estado === "COMPLETED"
                    ? "Completada"
                    : cita.estado === "SCHEDULED"
                      ? "Programada"
                      : cita.estado}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-12 border-t pt-4 text-center text-xs text-gray-500">
        <p>Este documento es confidencial y contiene información médica protegida.</p>
        <p className="mt-1">Chomyn Odontología • {new Date().getFullYear()}</p>
      </footer>
    </div>
  )
}
