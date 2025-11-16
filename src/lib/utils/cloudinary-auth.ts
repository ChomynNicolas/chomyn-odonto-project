import { cloudinary } from "@/lib/cloudinary"

/**
 * Cloudinary URL options type
 */
type CloudinaryUrlOptions = {
  secure?: boolean
  resource_type?: string
  sign_url?: boolean
  type?: string
  transformation?: Array<{
    width?: number
    height?: number
    crop?: string
    quality?: string | number
    format?: string
  }>
  format?: string
}

/**
 * Clean publicId by removing version numbers if present
 * Cloudinary publicIds can include version numbers like "v1234567890/folder/file"
 * For signed URLs, we typically don't need the version
 */
function cleanPublicId(publicId: string): string {
  // Remove version pattern: v1234567890/ at the start
  // But keep folder structure and filename
  const versionPattern = /^v\d+\//
  if (versionPattern.test(publicId)) {
    return publicId.replace(versionPattern, "")
  }
  return publicId
}

/**
 * Generate a signed URL for an authenticated Cloudinary resource
 * 
 * For authenticated resources, we use sign_url: true but NOT type: "authenticated"
 * Using type: "authenticated" creates URLs with /v1/ that return 404 errors
 * Instead, we use the default type (upload) with sign_url: true, which works correctly
 * for authenticated resources when properly configured in Cloudinary
 */
export async function generateAuthenticatedUrl(
  publicId: string,
  options: {
    resourceType?: "image" | "video" | "raw" | "auto"
    transformations?: Array<{
      width?: number
      height?: number
      crop?: string
      quality?: string | number
      format?: string
    }>
  } = {},
): Promise<string> {
  const { resourceType = "image", transformations = [] } = options

  // Clean publicId - remove version numbers if present
  // Cloudinary SDK handles versions automatically, but for signed URLs
  // we want to use the clean publicId
  const cleanedPublicId = cleanPublicId(publicId)
  
  const finalResourceType = resourceType === "auto" ? "image" : resourceType

  // Generate signed URL for authenticated resources
  // Key insight: For authenticated resources, we use sign_url: true but NOT type: "authenticated"
  // Using type: "authenticated" creates URLs with /v1/ that don't work
  // Instead, we use the default type (upload) with sign_url: true
  // This works because signed URLs can access authenticated resources when properly configured
  
  const urlOptions: CloudinaryUrlOptions = {
    secure: true,
    resource_type: finalResourceType,
    sign_url: true,
    // DO NOT use type: "authenticated" - it generates incorrect URLs
    // The default type (upload) with sign_url: true works for authenticated resources
  }

  // Only add transformations for images (not for raw files like PDFs)
  // Cloudinary doesn't support transformations on raw files
  if (finalResourceType === "image" && transformations.length > 0) {
    urlOptions.transformation = transformations
  }

  // Generate the URL using cleaned publicId
  // Cloudinary SDK will handle the publicId correctly, including folder paths
  const url = cloudinary.url(cleanedPublicId, urlOptions)
  
  return url
}

/**
 * Generate a signed URL for a public Cloudinary resource
 */
export function generatePublicUrl(
  publicId: string,
  options: {
    resourceType?: "image" | "video" | "raw" | "auto"
    transformations?: Array<{
      width?: number
      height?: number
      crop?: string
      quality?: string | number
      format?: string
    }>
  } = {},
): string {
  const { resourceType = "image", transformations = [] } = options
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!

  // Build transformation string
  const transformationParts: string[] = []
  if (transformations.length > 0) {
    transformations.forEach((trans) => {
      const parts: string[] = []
      if (trans.width) parts.push(`w_${trans.width}`)
      if (trans.height) parts.push(`h_${trans.height}`)
      if (trans.width || trans.height) {
        if (trans.crop) parts.push(`c_${trans.crop}`)
        if (trans.quality) parts.push(`q_${trans.quality}`)
      }
      if (trans.format) parts.push(`f_${trans.format}`)
      if (parts.length > 0) transformationParts.push(parts.join(","))
    })
  }

  const transStr = transformationParts.length > 0 ? transformationParts.join("/") + "/" : ""
  const finalResourceType = resourceType === "auto" ? "image" : resourceType

  return `https://res.cloudinary.com/${cloudName}/${finalResourceType}/upload/${transStr}${publicId}`
}

