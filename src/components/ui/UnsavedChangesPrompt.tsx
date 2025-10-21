// src/components/ui/UnsavedChangesPrompt.tsx
"use client";

import { useEffect } from "react";

export default function UnsavedChangesPrompt({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [active]);

  return null; // solo efecto
}
