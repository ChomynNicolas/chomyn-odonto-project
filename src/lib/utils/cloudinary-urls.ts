import { cloudinary } from "@/lib/cloudinary"

/**
 * Generate a signed URL for a Cloudinary resource
 * @param publicId - The Cloudinary public ID
 * @param options - Options for URL generation
 * @returns Signed URL string
 */
export function generateSignedUrl(
  publicId: string,
  options: {
    accessMode: "PUBLIC" | "AUTHENTICATED"
    transformation?: Array<{
      width?: number
      height?: number
      crop?: string
      quality?: string | number
      format?: string
    }>
    resourceType?: "image" | "video" | "raw" | "auto"
    format?: string
  },
): string {
  const { accessMode, transformation, resourceType = "auto", format } = options

  const urlOptions: any = {
    secure: true,
    resource_type: resourceType,
  }

  // For authenticated images, we need to sign the URL
  if (accessMode === "AUTHENTICATED") {
    urlOptions.sign_url = true
    urlOptions.type = "authenticated"
  }

  // Add transformations if provided
  if (transformation && transformation.length > 0) {
    urlOptions.transformation = transformation.map((t) => {
      const trans: any = {}
      if (t.width) trans.width = t.width
      if (t.height) trans.height = t.height
      if (t.crop) trans.crop = t.crop
      if (t.quality) trans.quality = t.quality
      if (t.format) trans.format = t.format
      return trans
    })
  }

  // Add format if provided
  if (format) {
    urlOptions.format = format
  }

  return cloudinary.url(publicId, urlOptions)
}

/**
 * Generate a thumbnail URL for an attachment
 * @param publicId - The Cloudinary public ID
 * @param accessMode - The access mode (PUBLIC or AUTHENTICATED)
 * @param resourceType - The resource type
 * @returns Thumbnail URL string
 */
export function generateThumbnailUrl(
  publicId: string,
  accessMode: "PUBLIC" | "AUTHENTICATED",
  resourceType: string = "image",
): string {
  return generateSignedUrl(publicId, {
    accessMode,
    resourceType: resourceType as "image" | "video" | "raw" | "auto",
    transformation: [
      {
        width: 200,
        height: 200,
        crop: "fill",
        quality: "auto",
      },
    ],
  })
}

/**
 * Generate a full image URL for an attachment
 * @param publicId - The Cloudinary public ID
 * @param accessMode - The access mode (PUBLIC or AUTHENTICATED)
 * @param resourceType - The resource type
 * @param maxWidth - Maximum width for the image (optional)
 * @returns Full image URL string
 */
export function generateFullImageUrl(
  publicId: string,
  accessMode: "PUBLIC" | "AUTHENTICATED",
  resourceType: string = "image",
  maxWidth?: number,
): string {
  const transformation = maxWidth
    ? [
        {
          width: maxWidth,
          crop: "limit" as const,
          quality: "auto" as const,
        },
      ]
    : undefined

  return generateSignedUrl(publicId, {
    accessMode,
    resourceType: resourceType as "image" | "video" | "raw" | "auto",
    transformation,
  })
}

