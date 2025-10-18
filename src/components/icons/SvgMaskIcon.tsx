// components/icons/SvgMaskIcon.tsx
"use client";

import * as React from "react";
import { clsx } from "clsx";

type SvgMaskIconProps = {
  /** nombre de archivo sin la extensión, p. ej. "admin" para /public/images/icons/admin.svg */
  name: string;
  /** tamaño Tailwind (w-4 h-4, etc.) */
  sizeClassName?: string; // ej: "h-4 w-4"
  /** clases extra: aquí pondrás el color (text-primary, etc.) */
  className?: string;
  /** etiqueta accesible si el ícono no es meramente decorativo */
  "aria-label"?: string;
};

export function SvgMaskIcon({
  name,
  sizeClassName = "h-4 w-4",
  className,
  ...rest
}: SvgMaskIconProps) {
  const url = `/images/icons/${name}.svg`;

  return (
    <span
      // bg-[currentColor] hace que el "relleno" sea el color actual
      className={clsx("inline-block align-middle bg-[currentColor]", sizeClassName, className)}
      style={{
        // CSS mask para soportar todos los navegadores
        maskImage: `url('${url}')`,
        WebkitMaskImage: `url('${url}')`,
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
        maskSize: "contain",
        WebkitMaskSize: "contain",
      }}
      {...rest}
    />
  );
}
