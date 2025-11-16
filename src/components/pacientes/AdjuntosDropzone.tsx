// src/components/pacientes/AdjuntosDropzone.tsx
"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import type { AdjuntoUI } from "@/lib/schema/paciente.schema"

export type UiTipoAdjunto = "FOTO" | "RADIOGRAFIA" | "DOCUMENTO" | "OTRO"

// Mapeo UI → tipo adjunto backend
type AdjuntoTipo =
  | "XRAY"
  | "INTRAORAL_PHOTO"
  | "EXTRAORAL_PHOTO"
  | "IMAGE"
  | "DOCUMENT"
  | "PDF"
  | "LAB_REPORT"
  | "OTHER"

interface AdjuntosDropzoneProps {
  adjuntos: AdjuntoUI[]
  onChangeAdjuntos: (adjuntos: AdjuntoUI[], files: Map<string, File>) => void
  disabled?: boolean
}

const MAX_MB = 25
const MAX_BYTES = MAX_MB * 1024 * 1024
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"] as const

// Mapeo UI → AdjuntoTipo
function decideAdjuntoTipo(file: File, ui: UiTipoAdjunto): AdjuntoTipo {
  if (file.type === "application/pdf") return "PDF"
  if (ui === "RADIOGRAFIA") return "XRAY"
  if (ui === "DOCUMENTO") return "DOCUMENT"
  if (ui === "FOTO") return "IMAGE"
  return "OTHER"
}

// Valida archivo antes de agregarlo
function validateFile(file: File): { valid: boolean; error?: string } {
  if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) {
    return {
      valid: false,
      error: `Tipo no permitido (${file.type}). Permitidos: ${ACCEPTED_TYPES.join(", ")}`,
    }
  }
  if (file.size > MAX_BYTES) {
    return {
      valid: false,
      error: `El archivo supera los ${MAX_MB}MB`,
    }
  }
  return { valid: true }
}

// Crea un AdjuntoUI desde un File
function createAdjuntoUI(file: File, tipoUi: UiTipoAdjunto): AdjuntoUI {
  const tipoAdj = decideAdjuntoTipo(file, tipoUi)
  return {
    id: crypto.randomUUID(),
    nombre: file.name,
    tipoMime: file.type,
    tamañoBytes: file.size,
    tipoUi,
    tipoAdj,
    estado: "pendiente",
  }
}

export default function AdjuntosDropzone({
  adjuntos,
  onChangeAdjuntos,
  disabled = false,
}: AdjuntosDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  // Map interno para guardar los File objects
  const filesMapRef = useRef<Map<string, File>>(new Map())

  function handleAddFiles(files: File[], tipoUi: UiTipoAdjunto) {
    const nuevos: AdjuntoUI[] = []
    const errores: string[] = []
    const nuevosFiles = new Map<string, File>()

    for (const file of files) {
      const validation = validateFile(file)
      if (!validation.valid) {
        errores.push(`${file.name}: ${validation.error ?? "Error desconocido"}`)
        continue
      }

      // Verificar duplicados por nombre
      const existe = adjuntos.some((a) => a.nombre === file.name && a.estado !== "error")
      if (existe) {
        errores.push(`${file.name}: Ya está en la lista`)
        continue
      }

      const adjunto = createAdjuntoUI(file, tipoUi)
      nuevos.push(adjunto)
      // Guardar el File object asociado al id del adjunto
      nuevosFiles.set(adjunto.id, file)
    }

    if (errores.length > 0) {
      console.warn("[AdjuntosDropzone] Errores al agregar archivos:", errores)
    }

    if (nuevos.length > 0) {
      // Actualizar el map interno
      nuevosFiles.forEach((file, id) => {
        filesMapRef.current.set(id, file)
      })
      // Notificar cambios con el map completo
      onChangeAdjuntos([...adjuntos, ...nuevos], new Map(filesMapRef.current))
    }
  }

  function handleRemove(id: string) {
    // Eliminar del map interno
    filesMapRef.current.delete(id)
    // Notificar cambios
    onChangeAdjuntos(
      adjuntos.filter((a) => a.id !== id),
      new Map(filesMapRef.current),
    )
  }

  function triggerPick(tipoUi: UiTipoAdjunto) {
    if (disabled) return
    inputRef.current?.setAttribute("data-ui-tipo", tipoUi)
    inputRef.current?.click()
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const tipoUi =
      (e.currentTarget.getAttribute("data-ui-tipo") as UiTipoAdjunto) || "OTRO"

    handleAddFiles(files, tipoUi)

    // Reset input
    e.target.value = ""
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setDragActive(true)
    }
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (disabled) return

    const files = Array.from(e.dataTransfer.files || [])
    if (files.length === 0) return

    handleAddFiles(files, "OTRO")
  }

  const pendientes = adjuntos.filter((a) => a.estado === "pendiente")
  const subiendo = adjuntos.filter((a) => a.estado === "subiendo")
  const cargados = adjuntos.filter((a) => a.estado === "cargado")
  const errores = adjuntos.filter((a) => a.estado === "error")

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          type="button"
          onClick={() => triggerPick("FOTO")}
          disabled={disabled}
        >
          Subir foto
        </Button>
        <Button
          variant="secondary"
          type="button"
          onClick={() => triggerPick("RADIOGRAFIA")}
          disabled={disabled}
        >
          Subir radiografía
        </Button>
        <Button
          variant="secondary"
          type="button"
          onClick={() => triggerPick("DOCUMENTO")}
          disabled={disabled}
        >
          Subir documento
        </Button>
        <Button
          variant="secondary"
          type="button"
          onClick={() => triggerPick("OTRO")}
          disabled={disabled}
        >
          Subir otro
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={ACCEPTED_TYPES.join(",")}
          multiple
          onChange={onInputChange}
          disabled={disabled}
        />
      </div>

      <div
        className={`rounded-lg border-2 border-dashed p-6 text-center text-sm transition-colors ${
          dragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 text-muted-foreground"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        Arrastrá archivos aquí o usá los botones de arriba.
        <div className="mt-2 text-xs">
          Permitidos: JPG, PNG, WEBP, GIF, PDF. Máx {MAX_MB}MB
        </div>
      </div>

      {adjuntos.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">
            {adjuntos.length} archivo{adjuntos.length !== 1 ? "s" : ""} seleccionado
            {adjuntos.length !== 1 ? "s" : ""}
          </div>

          <ul className="space-y-2">
            {pendientes.map((adjunto) => (
              <li
                key={adjunto.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="flex-1 text-sm">
                  <div className="font-medium">{adjunto.nombre}</div>
                  <div className="text-xs text-muted-foreground">
                    {(adjunto.tamañoBytes / 1024 / 1024).toFixed(2)} MB · {adjunto.tipoUi}
                  </div>
                </div>
                <Button
                  variant="outline"
                  type="button"
                  size="sm"
                  onClick={() => handleRemove(adjunto.id)}
                  disabled={disabled}
                >
                  Quitar
                </Button>
              </li>
            ))}

            {subiendo.map((adjunto) => (
              <li
                key={adjunto.id}
                className="flex items-center justify-between rounded-md border border-primary/50 bg-primary/5 p-3"
              >
                <div className="flex-1 text-sm">
                  <div className="font-medium">{adjunto.nombre}</div>
                  <div className="text-xs text-muted-foreground">Subiendo...</div>
                </div>
              </li>
            ))}

            {cargados.map((adjunto) => (
              <li
                key={adjunto.id}
                className="flex items-center justify-between rounded-md border border-green-500/50 bg-green-500/5 p-3"
              >
                <div className="flex-1 text-sm">
                  <div className="font-medium">{adjunto.nombre}</div>
                  <div className="text-xs text-green-600">✓ Cargado</div>
                </div>
              </li>
            ))}

            {errores.map((adjunto) => (
              <li
                key={adjunto.id}
                className="flex items-center justify-between rounded-md border border-red-500/50 bg-red-500/5 p-3"
              >
                <div className="flex-1 text-sm">
                  <div className="font-medium">{adjunto.nombre}</div>
                  <div className="text-xs text-red-600">
                    Error: {adjunto.errorMensaje || "Error desconocido"}
                  </div>
                </div>
                <Button
                  variant="outline"
                  type="button"
                  size="sm"
                  onClick={() => handleRemove(adjunto.id)}
                  disabled={disabled}
                >
                  Quitar
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
