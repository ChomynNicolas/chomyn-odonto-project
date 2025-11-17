// Main patient workspace page

import { Suspense } from 'react';
import { PatientWorkspace } from './_components/PatientWorkspace';
import { PatientWorkspaceSkeleton } from './_components/PatientWorkspaceSkeleton';

export default async function PatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patientId = Number(id);

  return (
    <div className="container mx-auto py-6 px-4">
      <Suspense fallback={<PatientWorkspaceSkeleton />}>
        <PatientWorkspace patientId={patientId} />
      </Suspense>
    </div>
  );
}
