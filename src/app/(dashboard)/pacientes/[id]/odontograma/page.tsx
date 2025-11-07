import React from "react"
import { OdontogramView } from "@/components/pacientes/odontograma/OdontogramView"

export default function OdontogramaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)
  return <OdontogramView patientId={id} />
}
