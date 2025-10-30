// StatusChips.tsx
"use client";

type Props = {
  value: string;
  options: string[];
  onChange: (v: string) => void;
};

export default function StatusChips({ value, options, onChange }: Props) {
  return (
    <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap gap-1">
      {options.map((name) => {
        const active = value === name;
        return (
          <button
            key={name}
            type="button"
            onClick={() => onChange(name)}
            aria-pressed={active}
            className={
              `rounded-md px-3 py-1.5 text-sm font-medium border ` +
              (active
                ? "bg-brand-50 text-brand-600 dark:bg-brand-500/[0.15] dark:text-brand-400 border-brand-200"
                : "bg-transparent text-gray-600 dark:text-gray-300 border-gray-200 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800")
            }
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}
