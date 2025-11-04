import PatientRecordPageClient from "@/components/pacientes/PatientRecordPageClient";
import React from "react";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  // En Server Components, params es objeto normal (no Promise)
  const { id } = React.use(params) 
  return <PatientRecordPageClient patientId={id} />;
}