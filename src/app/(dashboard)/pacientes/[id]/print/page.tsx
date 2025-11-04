"use client"

import type { PatientRecord } from "@/lib/types/patient"
import { calculateAge, formatFullName, formatGender, formatDate } from "@/lib/utils/patient-helpers"

// This would be replaced with actual data fetching
async function getPatientData(id: string): Promise<PatientRecord> {
  // Mock data fetch - replace with actual API call
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pacientes/${id}`, {
    cache: "no-store",
  })
  return response.json()
}

export default async function PatientPrintPage({ params }: { params: { id: string } }) {
  const patient = await getPatientData(params.id)
  const age = calculateAge(patient.dateOfBirth)
  const fullName = formatFullName(patient.firstName, patient.lastName, patient.secondLastName)

  // Get active clinical data
  const activeDiagnoses = patient.diagnoses?.filter((d) => d.status === "ACTIVE") || []
  const activeAllergies = patient.allergies || []
  const activeMedications = patient.medications?.filter((m) => m.status === "ACTIVE") || []
  const latestVitalSigns = patient.vitalSigns?.sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
  )[0]
  const activeTreatmentPlan = patient.treatmentPlans?.find((p) => p.status === "ACTIVE")

  return (
    <div className="print-layout">
      <style jsx global>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print-layout {
            width: 210mm;
            min-height: 297mm;
            padding: 20mm;
            margin: 0 auto;
            background: white;
            font-size: 10pt;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
        @media screen {
          .print-layout {
            max-width: 210mm;
            min-height: 297mm;
            padding: 20mm;
            margin: 20px auto;
            background: white;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          }
        }
      `}</style>

      {/* Header */}
      <header className="mb-6 border-b-2 border-gray-800 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Clínica Dental</h1>
            <p className="text-sm text-gray-600">Ficha Clínica del Paciente</p>
          </div>
          <div className="text-right text-sm">
            <p>Fecha de Impresión:</p>
            <p className="font-medium">{formatDate(new Date().toISOString(), true)}</p>
          </div>
        </div>
      </header>

      {/* Patient Information */}
      <section className="mb-6">
        <h2 className="mb-3 text-lg font-bold border-b border-gray-300 pb-1">Información del Paciente</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-600">Nombre Completo</p>
            <p className="font-semibold">{fullName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Fecha de Nacimiento / Edad</p>
            <p className="font-semibold">
              {formatDate(patient.dateOfBirth)} ({age} años)
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Género</p>
            <p className="font-semibold">{formatGender(patient.gender)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Documento</p>
            <p className="font-semibold">
              {patient.documentType}: {patient.documentNumber || "N/A"}
            </p>
          </div>
          {patient.address && (
            <div className="col-span-2">
              <p className="text-xs text-gray-600">Dirección</p>
              <p className="font-semibold">
                {patient.address}
                {patient.city && `, ${patient.city}`}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Contacts */}
      {patient.contacts && patient.contacts.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-lg font-bold border-b border-gray-300 pb-1">Contactos</h2>
          <div className="grid grid-cols-2 gap-2">
            {patient.contacts.slice(0, 4).map((contact) => (
              <div key={contact.id}>
                <p className="text-xs text-gray-600">{contact.type}</p>
                <p className="font-medium">{contact.value}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Allergies - CRITICAL */}
      {activeAllergies.length > 0 && (
        <section className="mb-6 rounded border-2 border-red-600 bg-red-50 p-3">
          <h2 className="mb-2 text-lg font-bold text-red-800">⚠ ALERGIAS</h2>
          <ul className="list-inside list-disc space-y-1">
            {activeAllergies.map((allergy) => (
              <li key={allergy.id} className="font-semibold">
                {allergy.allergen} - {allergy.severity}
                {allergy.reaction && ` (${allergy.reaction})`}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Active Diagnoses */}
      {activeDiagnoses.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-lg font-bold border-b border-gray-300 pb-1">Diagnósticos Activos</h2>
          <ul className="space-y-2">
            {activeDiagnoses.map((diagnosis) => (
              <li key={diagnosis.id} className="flex justify-between">
                <span>
                  <strong>{diagnosis.label}</strong> ({diagnosis.code})
                </span>
                <span className="text-sm text-gray-600">{formatDate(diagnosis.diagnosedAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Active Medications */}
      {activeMedications.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-lg font-bold border-b border-gray-300 pb-1">Medicación Activa</h2>
          <ul className="space-y-2">
            {activeMedications.map((medication) => (
              <li key={medication.id}>
                <p className="font-semibold">{medication.name}</p>
                <p className="text-sm text-gray-600">
                  {medication.dosage && `Dosis: ${medication.dosage}`}
                  {medication.frequency && ` • Frecuencia: ${medication.frequency}`}
                  {medication.route && ` • Vía: ${medication.route}`}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Latest Vital Signs */}
      {latestVitalSigns && (
        <section className="mb-6">
          <h2 className="mb-3 text-lg font-bold border-b border-gray-300 pb-1">Últimos Signos Vitales</h2>
          <p className="mb-2 text-xs text-gray-600">Registrado: {formatDate(latestVitalSigns.recordedAt, true)}</p>
          <div className="grid grid-cols-4 gap-3">
            {latestVitalSigns.height && (
              <div>
                <p className="text-xs text-gray-600">Altura</p>
                <p className="font-semibold">{latestVitalSigns.height} cm</p>
              </div>
            )}
            {latestVitalSigns.weight && (
              <div>
                <p className="text-xs text-gray-600">Peso</p>
                <p className="font-semibold">{latestVitalSigns.weight} kg</p>
              </div>
            )}
            {latestVitalSigns.systolicBP && (
              <div>
                <p className="text-xs text-gray-600">TA</p>
                <p className="font-semibold">
                  {latestVitalSigns.systolicBP}/{latestVitalSigns.diastolicBP} mmHg
                </p>
              </div>
            )}
            {latestVitalSigns.heartRate && (
              <div>
                <p className="text-xs text-gray-600">FC</p>
                <p className="font-semibold">{latestVitalSigns.heartRate} lpm</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Active Treatment Plan */}
      {activeTreatmentPlan && (
        <section className="mb-6">
          <h2 className="mb-3 text-lg font-bold border-b border-gray-300 pb-1">Plan de Tratamiento Activo</h2>
          <p className="mb-3 font-semibold">{activeTreatmentPlan.title}</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-1 text-left">#</th>
                <th className="py-1 text-left">Procedimiento</th>
                <th className="py-1 text-left">Diente</th>
                <th className="py-1 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {activeTreatmentPlan.steps
                .sort((a, b) => a.order - b.order)
                .map((step) => (
                  <tr key={step.id} className="border-b">
                    <td className="py-1">{step.order}</td>
                    <td className="py-1">{step.procedure.name}</td>
                    <td className="py-1">{step.tooth || "-"}</td>
                    <td className="py-1">{step.status}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Recent Appointments */}
      {patient.appointments && patient.appointments.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-lg font-bold border-b border-gray-300 pb-1">Últimas Citas</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-1 text-left">Fecha</th>
                <th className="py-1 text-left">Profesional</th>
                <th className="py-1 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {patient.appointments
                .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
                .slice(0, 5)
                .map((apt) => (
                  <tr key={apt.id} className="border-b">
                    <td className="py-1">{formatDate(apt.scheduledAt, true)}</td>
                    <td className="py-1">
                      {apt.professional.firstName} {apt.professional.lastName}
                    </td>
                    <td className="py-1">{apt.status}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-8 border-t border-gray-300 pt-4 text-center text-xs text-gray-600">
        <p>Este documento es confidencial y contiene información médica protegida.</p>
        <p>Generado el {formatDate(new Date().toISOString(), true)}</p>
      </footer>
    </div>
  )
}
