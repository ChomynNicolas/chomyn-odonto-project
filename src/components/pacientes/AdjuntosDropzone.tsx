"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export type UiTipoAdjunto = "FOTO" | "RADIOGRAFIA" | "DOCUMENTO" | "OTRO"

// === Tu enum de backend ===
// "XRAY" | "INTRAORAL_PHOTO" | "EXTRAORAL_PHOTO" | "IMAGE" | "DOCUMENT" | "PDF" | "LAB_REPORT" | "OTHER"
type AdjuntoTipo =
  | "XRAY" | "INTRAORAL_PHOTO" | "EXTRAORAL_PHOTO" | "IMAGE"
  | "DOCUMENT" | "PDF" | "LAB_REPORT" | "OTHER"

export type FileItem = {
  id: string                  // usamos public_id cuando esté disponible
  nombre: string
  tipoUi: UiTipoAdjunto
  tipoAdj?: AdjuntoTipo       // tipo clínico final que persistiremos
  url: string
  progress?: number
  _cloud?: {
    publicId: string
    secureUrl: string
    bytes: number
    format?: string
    width?: number
    height?: number
    duration?: number
    resourceType?: string
    folder?: string
    originalFilename?: string
    etag?: string
    version?: number
    accessMode?: "PUBLIC" | "AUTHENTICATED"
  }
  persisted?: boolean
}

type Props = {
  files: FileItem[]
  onChange: (arr: FileItem[]) => void
  pacienteId?: number
  onBusyChange?: (busy: boolean) => void   // 👈 NUEVO
}

const MAX_MB = 25
const MAX_BYTES = MAX_MB * 1024 * 1024
const ACCEPTED = ["image/jpeg","image/png","image/webp","image/gif","application/pdf"] as const

// Mapeo UI → AdjuntoTipo (si es PDF, forzamos "PDF")
function decideAdjuntoTipo(file: File, ui: UiTipoAdjunto): AdjuntoTipo {
  if (file.type === "application/pdf") return "PDF"
  if (ui === "RADIOGRAFIA") return "XRAY"
  if (ui === "DOCUMENTO") return "DOCUMENT"
  if (ui === "FOTO") return "IMAGE" // si más adelante diferencias intra/extra, cambia aquí
  return "OTHER"
}

export default function AdjuntosDropzone({ files, onChange, pacienteId, onBusyChange }: Props) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)


  useEffect(() => { onBusyChange?.(uploading) }, [uploading, onBusyChange])

  function addOrUpdate(item: FileItem) {
    const others = (files || []).filter(f => f.id !== item.id)
    onChange([...others, item])
  }
  function remove(id: string) {
    onChange((files || []).filter(f => f.id !== id))
  }

  async function signUpload(pacienteId: number | undefined, tipo: AdjuntoTipo) {
    const res = await fetch("/api/uploads/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        pacienteId: pacienteId ?? undefined,
        tipo,
      }),
    })
    const data = await res.json()
    if (!res.ok || !data?.ok) throw new Error(data?.error ?? "No se pudo firmar la subida")
    return data.data as {
      cloudName: string
      apiKey: string
      timestamp: number
      signature: string
      folder: string
      accessMode: "PUBLIC" | "AUTHENTICATED"
      publicId: string | null
    }
  }

  async function uploadToCloudinary(file: File, tipoFinal: AdjuntoTipo, onProgress: (p: number) => void) {
    const signed = await signUpload(pacienteId, tipoFinal)
    const endpoint = `https://api.cloudinary.com/v1_1/${signed.cloudName}/auto/upload`
    const form = new FormData()
    form.append("file", file)
    form.append("api_key", signed.apiKey)
    form.append("timestamp", String(signed.timestamp))
    form.append("signature", signed.signature)
    form.append("folder", signed.folder)
    form.append("access_mode", signed.accessMode.toLowerCase())
    if (signed.publicId) form.append("public_id", signed.publicId)

    const xhr = new XMLHttpRequest()
    const prom = new Promise<{
      public_id: string
      secure_url: string
      bytes: number
      format?: string
      width?: number
      height?: number
      duration?: number
      resource_type: string
      folder?: string
      original_filename?: string
      etag?: string
      version?: number
      access_mode?: string
      error?: { message?: string }
    }>((resolve, reject) => {
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) onProgress(Math.round((ev.loaded / ev.total) * 100))
      }
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          try {
            const resp = JSON.parse(xhr.responseText || "{}")
            if (xhr.status >= 200 && xhr.status < 300) resolve(resp)
            else reject(new Error(resp?.error?.message || "Error en upload"))
          } catch (e) { reject(e) }
        }
      }
      xhr.open("POST", endpoint, true)
      xhr.send(form)
    })
    return await prom
  }

  async function persistAdjunto(pacienteId: number, meta: NonNullable<FileItem["_cloud"]>, tipoAdj: AdjuntoTipo, descripcion?: string) {
    const res = await fetch(`/api/pacientes/${pacienteId}/adjuntos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        publicId: meta.publicId,
        secureUrl: meta.secureUrl,
        bytes: meta.bytes,
        format: meta.format,
        width: meta.width,
        height: meta.height,
        duration: meta.duration,
        resourceType: meta.resourceType,
        folder: meta.folder,
        originalFilename: meta.originalFilename,
        version: meta.version,
        accessMode: meta.accessMode, // opcional
        tipo: tipoAdj,
        descripcion,
      }),
    })
    const data = await res.json()
    if (!res.ok || !data?.ok) throw new Error(data?.error ?? "No se pudo persistir el adjunto")
    return data.data
  }

  function validate(f: File) {
    if (!ACCEPTED.includes(f.type as (typeof ACCEPTED)[number])) throw new Error(`Tipo no permitido (${f.type}). Permitidos: ${ACCEPTED.join(", ")}`)
    if (f.size > MAX_BYTES) throw new Error(`El archivo supera los ${MAX_MB}MB`)
  }

  function triggerPick(tipoUi: UiTipoAdjunto) {
    inputRef.current?.setAttribute("data-ui-tipo", tipoUi)
    inputRef.current?.click()
  }

  async function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files || [])
    const ui = (e.currentTarget.getAttribute("data-ui-tipo") as UiTipoAdjunto) || "OTRO"
    if (!list.length) return

    setUploading(true)
    for (const f of list) {
      try {
        validate(f)
        const tipoAdj = decideAdjuntoTipo(f, ui)
        const tempId = crypto.randomUUID()
        const tempItem: FileItem = { id: tempId, nombre: f.name, tipoUi: ui, tipoAdj, url: "", progress: 0 }
        addOrUpdate(tempItem)

        const uploaded = await uploadToCloudinary(f, tipoAdj, (p) => addOrUpdate({ ...tempItem, progress: p }))

        const cloudMeta: NonNullable<FileItem["_cloud"]> = {
          publicId: uploaded.public_id,
          secureUrl: uploaded.secure_url,
          bytes: uploaded.bytes,
          format: uploaded.format,
          width: uploaded.width,
          height: uploaded.height,
          duration: uploaded.duration,
          resourceType: uploaded.resource_type,
          folder: uploaded.folder,
          originalFilename: uploaded.original_filename,
          etag: uploaded.etag,
          version: uploaded.version,
          accessMode: (uploaded.access_mode?.toUpperCase?.() as "PUBLIC"|"AUTHENTICATED") || "AUTHENTICATED",
        }

        addOrUpdate({
          ...tempItem,
          id: uploaded.public_id,
          url: uploaded.secure_url,
          progress: 100,
          _cloud: cloudMeta,
        })

        if (typeof pacienteId === "number") {
          await persistAdjunto(pacienteId, cloudMeta, tipoAdj)
          addOrUpdate({ ...tempItem, id: uploaded.public_id, url: uploaded.secure_url, progress: 100, _cloud: cloudMeta, persisted: true })
          toast("Adjunto guardado", { description: `${f.name} (${tipoAdj})` })
        } else {
          toast("Archivo subido", { description: `${f.name} (pendiente de asociar al paciente)` })
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        toast.error("Error al subir adjunto", { description: errorMessage })
      }
    }
    e.target.value = ""
    setUploading(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" type="button" onClick={() => triggerPick("FOTO")} disabled={uploading}>Subir foto</Button>
        <Button variant="secondary" type="button" onClick={() => triggerPick("RADIOGRAFIA")} disabled={uploading}>Subir radiografía</Button>
        <Button variant="secondary" type="button" onClick={() => triggerPick("DOCUMENTO")} disabled={uploading}>Subir documento</Button>
        <Button variant="secondary" type="button" onClick={() => triggerPick("OTRO")} disabled={uploading}>Subir otro</Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={ACCEPTED.join(",")}
          multiple
          onChange={onInputChange}
        />
      </div>

      <div
        className="rounded-lg border-2 border-dashed p-6 text-center text-sm text-muted-foreground"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const dt = e.dataTransfer; if (!dt?.files?.length) return
          inputRef.current?.setAttribute("data-ui-tipo", "OTRO")
          const v = new DataTransfer(); Array.from(dt.files).forEach(f => v.items.add(f))
          inputRef.current!.files = v.files
          inputRef.current!.dispatchEvent(new Event("change", { bubbles: true }))
        }}
      >
        Arrastrá archivos aquí o usá los botones de arriba.
        <div className="mt-2 text-xs">Permitidos: JPG, PNG, WEBP, GIF, PDF. Máx {MAX_MB}MB</div>
      </div>

      <ul className="space-y-2">
        {(files || []).map((f) => (
          <li key={f.id} className="rounded-md border p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="truncate">{f.nombre} · {f.tipoAdj ?? f.tipoUi} {f.persisted ? "· guardado" : ""}</span>
              <div className="flex items-center gap-3">
                {typeof f.progress === "number" && f.progress < 100 && (
                  <span className="text-xs text-muted-foreground">{Math.round(f.progress)}%</span>
                )}
                <Button variant="outline" type="button" onClick={() => remove(f.id)} disabled={uploading}>Quitar</Button>
              </div>
            </div>
            {typeof f.progress === "number" && f.progress < 100 && (
              <div className="mt-2 h-2 w-full rounded bg-muted">
                <div className="h-2 rounded bg-primary" style={{ width: `${f.progress}%` }} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
