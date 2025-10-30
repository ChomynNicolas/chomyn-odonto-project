// ResultsCount.tsx
"use client";

export default function ResultsCount({ count }: { count: number }) {
  return (
    <p className="text-xs text-muted-foreground mt-1 sm:mt-0 sm:ml-2" aria-live="polite">
      {count === 0 ? "Sin resultados" : count === 1 ? "1 resultado" : `${count} resultados`}
    </p>
  );
}
