"use client";
import Link from "next/link";

export default function Banner({
  message,
  href,
  onClose,
}: { message: string; href?: string; onClose?: () => void }) {
  return (
    <div className="flex items-start justify-between rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700 dark:border-brand-500/20 dark:bg-brand-500/[0.12] dark:text-brand-400">
      <div className="pr-4">
        {message}{" "}
        {href && (
          <Link href={href} className="font-medium underline underline-offset-2">
            Completar datos
          </Link>
        )}
      </div>
      <button onClick={onClose} className="ml-4 rounded-md px-2 py-1 text-brand-700 hover:bg-brand-100 dark:text-brand-300 dark:hover:bg-white/10">
        Cerrar
      </button>
    </div>
  );
}
