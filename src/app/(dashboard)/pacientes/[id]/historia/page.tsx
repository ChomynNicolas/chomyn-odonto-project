import React from "react"
import { HistoriaClinicaView } from "@/components/pacientes/historia/HistoriaClinicaView"

export default function HistoriaClinicaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)
  return <HistoriaClinicaView patientId={id} />
}
