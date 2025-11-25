// Main patient workspace page

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { PatientWorkspace } from './_components/PatientWorkspace';
import { PatientWorkspaceSkeleton } from './_components/PatientWorkspaceSkeleton';

export default async function PatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Verify authentication
  const session = await auth();
  if (!session?.user) {
    redirect('/signin');
  }

  const { id } = await params;
  const patientId = Number(id);

  // Validate patientId
  if (isNaN(patientId) || patientId <= 0) {
    redirect('/pacientes');
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <Suspense fallback={<PatientWorkspaceSkeleton />}>
        {/* PatientTabs uses useSearchParams, so it needs Suspense boundary */}
        <PatientWorkspace patientId={patientId} />
      </Suspense>
    </div>
  );
}
