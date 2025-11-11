/**
 * Utility functions for detecting file types and MIME types
 * Handles various file formats including PDFs, images, documents, etc.
 */

export interface FileTypeInfo {
  resourceType: "image" | "video" | "raw" | "auto"
  mimeType: string
  extension: string
  isDocument: boolean
  isImage: boolean
  isVideo: boolean
  isPDF: boolean
}

/**
 * Detect file type from multiple sources
 */
export function detectFileType(params: {
  format?: string | null
  resourceType?: string | null
  publicId?: string
  originalFilename?: string | null
  mimeType?: string | null
  folder?: string | null
}): FileTypeInfo {
  const { format, resourceType, publicId, originalFilename, mimeType, folder } = params

  // Normalize inputs
  const formatLower = format?.toLowerCase() || ""
  const resourceTypeLower = resourceType?.toLowerCase() || ""
  const publicIdLower = publicId?.toLowerCase() || ""
  const filenameLower = originalFilename?.toLowerCase() || ""
  const mimeTypeLower = mimeType?.toLowerCase() || ""
  const folderLower = folder?.toLowerCase() || ""

  // Check if it's a PDF
  // Check format, filename, publicId, folder path, and mimeType
  // Folder paths like "chomyn/dev/otros/sin-procedimiento/pdf/..." indicate PDFs
  const publicIdContainsPdf = publicIdLower.includes("/pdf/") || publicIdLower.endsWith(".pdf")
  const folderContainsPdf = folderLower.includes("/pdf") || folderLower.endsWith("/pdf")
  const isPDF =
    formatLower === "pdf" ||
    publicIdContainsPdf ||
    folderContainsPdf ||
    filenameLower.endsWith(".pdf") ||
    mimeTypeLower === "application/pdf"

  // Check if it's a document (PDF, DOC, DOCX, etc.)
  const documentFormats = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "rtf"]
  const isDocument =
    isPDF ||
    documentFormats.some((ext) => 
      formatLower === ext ||
      filenameLower.endsWith(`.${ext}`) ||
      publicIdLower.endsWith(`.${ext}`)
    )

  // Check if it's an image
  const imageFormats = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "ico", "tiff", "tif"]
  const isImage =
    !isDocument &&
    (resourceTypeLower === "image" ||
      imageFormats.some((ext) => 
        formatLower === ext ||
        filenameLower.endsWith(`.${ext}`) ||
        publicIdLower.endsWith(`.${ext}`) ||
        mimeTypeLower.startsWith("image/")
      ))

  // Check if it's a video
  const videoFormats = ["mp4", "avi", "mov", "wmv", "flv", "webm", "mkv", "m4v"]
  const isVideo =
    resourceTypeLower === "video" ||
    videoFormats.some((ext) => 
      formatLower === ext ||
      filenameLower.endsWith(`.${ext}`) ||
      publicIdLower.endsWith(`.${ext}`) ||
      mimeTypeLower.startsWith("video/")
    )

  // Determine resource type for Cloudinary
  let finalResourceType: "image" | "video" | "raw" | "auto"
  if (isPDF || isDocument) {
    finalResourceType = "raw"
  } else if (isVideo) {
    finalResourceType = "video"
  } else if (isImage) {
    finalResourceType = "image"
  } else if (resourceTypeLower === "raw") {
    finalResourceType = "raw"
  } else if (resourceTypeLower === "video") {
    finalResourceType = "video"
  } else if (resourceTypeLower === "image") {
    finalResourceType = "image"
  } else {
    // Default to image if uncertain
    finalResourceType = "auto"
  }

  // Determine MIME type
  let mimeTypeResult = "application/octet-stream"
  if (isPDF) {
    mimeTypeResult = "application/pdf"
  } else if (isImage) {
    if (formatLower) {
      if (formatLower === "jpg" || formatLower === "jpeg") {
        mimeTypeResult = "image/jpeg"
      } else if (formatLower === "svg") {
        mimeTypeResult = "image/svg+xml"
      } else {
        mimeTypeResult = `image/${formatLower}`
      }
    } else {
      mimeTypeResult = "image/jpeg" // Default for images
    }
  } else if (isVideo) {
    if (formatLower) {
      mimeTypeResult = `video/${formatLower}`
    } else {
      mimeTypeResult = "video/mp4" // Default for videos
    }
  } else if (isDocument) {
    // Document MIME types
    if (formatLower === "doc" || filenameLower.endsWith(".doc")) {
      mimeTypeResult = "application/msword"
    } else if (formatLower === "docx" || filenameLower.endsWith(".docx")) {
      mimeTypeResult = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    } else if (formatLower === "xls" || filenameLower.endsWith(".xls")) {
      mimeTypeResult = "application/vnd.ms-excel"
    } else if (formatLower === "xlsx" || filenameLower.endsWith(".xlsx")) {
      mimeTypeResult = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    } else if (formatLower === "txt" || filenameLower.endsWith(".txt")) {
      mimeTypeResult = "text/plain"
    } else if (formatLower === "rtf" || filenameLower.endsWith(".rtf")) {
      mimeTypeResult = "application/rtf"
    } else {
      mimeTypeResult = "application/octet-stream"
    }
  } else if (mimeTypeLower) {
    mimeTypeResult = mimeTypeLower
  }

  // Determine file extension
  let extension = formatLower || "bin"
  if (isPDF) {
    extension = "pdf"
  } else if (originalFilename) {
    const match = originalFilename.match(/\.([a-z0-9]+)$/i)
    if (match) {
      extension = match[1].toLowerCase()
    }
  } else if (publicId) {
    const match = publicId.match(/\.([a-z0-9]+)$/i)
    if (match) {
      extension = match[1].toLowerCase()
    }
  }

  return {
    resourceType: finalResourceType,
    mimeType: mimeTypeResult,
    extension,
    isDocument,
    isImage,
    isVideo,
    isPDF,
  }
}

/**
 * Get appropriate filename with extension
 */
export function getFilenameWithExtension(
  originalFilename: string | null | undefined,
  fileTypeInfo: FileTypeInfo,
  fallbackBaseName: string,
): string {
  if (originalFilename) {
    // Check if filename already has an extension
    if (originalFilename.includes(".")) {
      return originalFilename
    }
    // Add extension if missing
    return `${originalFilename}.${fileTypeInfo.extension}`
  }

  // Generate filename from base name and extension
  return `${fallbackBaseName}.${fileTypeInfo.extension}`
}

/**
 * Sanitize filename for use in Content-Disposition header
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "")
}

