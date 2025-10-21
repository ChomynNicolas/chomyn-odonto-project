// src/components/pacientes/detail/PatientDetailSkeleton.tsx
export default function PatientDetailSkeleton() {
  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="h-6 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted" />
      </div>

      <nav className="flex gap-2 rounded-lg border border-border bg-card p-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 w-28 animate-pulse rounded bg-muted" />
        ))}
      </nav>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded bg-muted" />
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </div>
    </section>
  );
}

// src/components/pacientes/detail/PatientNotFound.tsx
export function PatientNotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h1 className="text-base font-semibold">Paciente no encontrado</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        El ID no coincide con un registro existente o ya no está activo.
      </p>
      <button
        className="mt-4 rounded-md border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5"
        onClick={onBack}
      >
        Volver al listado
      </button>
    </div>
  );
}

// src/components/pacientes/detail/PatientError.tsx
export function PatientError({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
    >
      Ocurrió un error al cargar el paciente.{" "}
      <button onClick={onRetry} className="underline underline-offset-2">Reintentar</button>
      {process.env.NODE_ENV !== "production" && message ? <span className="ml-2 opacity-70">({message})</span> : null}
    </div>
  );
}
