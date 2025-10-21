export default function PacientesSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="h-16 animate-pulse rounded bg-muted" />
        <div className="h-16 animate-pulse rounded bg-muted" />
        <div className="h-16 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
