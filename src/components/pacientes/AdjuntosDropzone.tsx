// src/components/pacientes/AdjuntosDropzone.tsx
"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"

type FileItem = { id: string; nombre: string; tipo: "CEDULA" | "RADIOGRAFIA" | "OTRO"; url: string; progress?: number }

export default function AdjuntosDropzone({
  files,
  onChange,
}: { files: FileItem[]; onChange: (arr: FileItem[]) => void }) {
  const [uploading, setUploading] = useState(false)

  const simulateUpload = (fileName: string, tipo: FileItem["tipo"]) => {
    setUploading(true)
    const id = crypto.randomUUID()
    let progress = 0
    const url = "https://placehold.co/600x400" // mock
    const tick = () => {
      progress += Math.random() * 25
      if (progress >= 100) {
        onChange([...(files || []), { id, nombre: fileName, tipo, url, progress: 100 }])
        setUploading(false)
      } else {
        // actualiza en vivo
        const partial = { id, nombre: fileName, tipo, url, progress }
        const others = (files || []).filter((f) => f.id !== id)
        onChange([...others, partial])
        setTimeout(tick, 250)
      }
    }
    setTimeout(tick, 250)
  }

  const remove = (id: string) => onChange((files || []).filter((f) => f.id !== id))

  return (
    <div className="space-y-3">
      <div className="border-2 border-dashed rounded-lg p-6 text-center text-gray-500 dark:border-gray-800">
        Arrastra aquí (mock) o
        <Button
          type="button"
          onClick={() => simulateUpload("cedula_frente.jpg", "CEDULA")}
          className="ml-3 bg-brand-500 hover:bg-brand-600"
        >
          Subir ejemplo
        </Button>
      </div>

      <ul className="space-y-2">
        {(files || []).map((f) => (
          <li key={f.id} className="rounded-md border p-3 dark:border-gray-800">
            <div className="flex items-center justify-between text-sm">
              <span>
                {f.nombre} · {f.tipo}
              </span>
              <div className="flex items-center gap-3">
                {typeof f.progress === "number" && f.progress < 100 && (
                  <span className="text-xs text-muted-foreground">{Math.round(f.progress)}%</span>
                )}
                <Button type="button" variant="outline" onClick={() => remove(f.id)}>
                  Quitar
                </Button>
              </div>
            </div>
            {typeof f.progress === "number" && f.progress < 100 && (
              <div className="mt-2 h-2 w-full rounded bg-gray-100 dark:bg-gray-900">
                <div className="h-2 rounded bg-brand-500" style={{ width: `${f.progress}%` }} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
