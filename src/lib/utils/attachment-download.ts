// Utility functions for downloading attachments

import type { Attachment } from "@/lib/types/patient"
import { toast } from "sonner"

/**
 * Download an attachment using the proxy endpoint
 * This ensures secure access to authenticated Cloudinary resources
 */
export async function downloadAttachment(attachment: Attachment): Promise<void> {
  try {
    // Generate download URL using proxy endpoint
    // attachment.id already contains the prefix (e.g., "adjunto-123" or "consentimiento-456")
    const downloadUrl = `/api/adjuntos/${attachment.id}/download`

    // Create a temporary anchor element to trigger download
    const link = document.createElement("a")
    link.href = downloadUrl
    link.download = attachment.fileName || `archivo-${attachment.id}`
    link.style.display = "none"

    // Append to body, click, and remove
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success("Descarga iniciada", {
      description: `Descargando ${attachment.fileName}`,
    })
  } catch (error) {
    console.error("Error downloading attachment:", error)
    toast.error("Error al descargar archivo", {
      description: error instanceof Error ? error.message : "Error desconocido",
    })
    throw error
  }
}

/**
 * Open attachment in new tab (for preview/download)
 */
export function openAttachmentInNewTab(attachment: Attachment): void {
  const url = attachment.secureUrl?.includes("/api/adjuntos/")
    ? attachment.secureUrl
    : `/api/adjuntos/adjunto-${attachment.id}/image`

  window.open(url, "_blank", "noopener,noreferrer")
}

