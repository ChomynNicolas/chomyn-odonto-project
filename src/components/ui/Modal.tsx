"use client";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

type Props = {
  // Compat: acepta ambas variantes
  open?: boolean;
  isOpen?: boolean;

  onClose: () => void;
  title?: string;
  children: React.ReactNode;

  // Estilos panel
  maxWidthClass?: string; // ej: "max-w-lg" | "max-w-2xl"
  className?: string;     // extra classes para el panel
};

function Modal({
  open,
  isOpen,
  onClose,
  title,
  children,
  maxWidthClass = "max-w-lg",
  className,
}: Props) {
  const visible = isOpen ?? open ?? false;
  const panelRef = useRef<HTMLDivElement>(null);

  // Cerrar con ESC
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [visible, onClose]);

  // Focus inicial al panel
  useEffect(() => {
    if (visible && panelRef.current) panelRef.current.focus();
  }, [visible]);

  if (!visible) return null;

  return createPortal(
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative w-full ${maxWidthClass} rounded-xl border border-gray-200 bg-card p-0 shadow-theme-xl outline-none dark:border-gray-800 ${className ?? ""}`}
      >
        <header className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-gray-800">
          <h2 className="text-sm font-medium text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 focus:shadow-focus-ring dark:text-gray-400 dark:hover:bg-white/5"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </header>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}

export default Modal;
// Compat: permite también `import { Modal }`
export { Modal };
