// EmptyState.tsx
"use client";

import Link from "next/link";
import Button from "../ui/button/Button";

export default function EmptyState({ showCta, message }: { showCta: boolean; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-8 text-center">
      <svg className="mb-2 h-8 w-8 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M4 6a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v2H4V6Zm16 6H4v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6Z"/>
      </svg>
      <p className="text-sm text-muted-foreground">{message}</p>
      {showCta && (
        <Link href="/pacientes/nuevo">
          <Button variant="outline" className="mt-3">Crear primer paciente</Button>
        </Link>
      )}
    </div>
  );
}
