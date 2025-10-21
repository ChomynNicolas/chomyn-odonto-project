// src/components/pacientes/detail/TabSection.tsx
export function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <h4 className="text-sm font-medium">{title}</h4>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function EmptyText({ text = "Sin información disponible." }: { text?: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

export function InlineError({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
      {message || "Ocurrió un error."}{" "}
      <button className="underline underline-offset-2" onClick={onRetry}>Reintentar</button>
    </div>
  );
}

export function SmallSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 w-full animate-pulse rounded bg-muted" />
      ))}
    </div>
  );
}
