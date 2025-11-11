import { NextResponse } from "next/server"
import { cloudinary } from "@/lib/cloudinary"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { generateAuthenticatedUrl, generatePublicUrl } from "@/lib/utils/cloudinary-auth"
import { detectFileType, getFilenameWithExtension, sanitizeFilename, type FileTypeInfo } from "@/lib/utils/file-type-detection"

/**
 * Parse attachment ID from format "adjunto-{id}" or "consentimiento-{id}" or just "{id}"
 */
function parseAttachmentId(id: string): { type: "adjunto" | "consentimiento"; numericId: number } | null {
  // Handle format "adjunto-{id}"
  if (id.startsWith("adjunto-")) {
    const numericId = Number.parseInt(id.replace("adjunto-", ""))
    if (!isNaN(numericId)) {
      return { type: "adjunto", numericId }
    }
  }
  
  // Handle format "consentimiento-{id}"
  if (id.startsWith("consentimiento-")) {
    const numericId = Number.parseInt(id.replace("consentimiento-", ""))
    if (!isNaN(numericId)) {
      return { type: "consentimiento", numericId }
    }
  }
  
  // Handle plain numeric ID
  const numericId = Number.parseInt(id)
  if (!isNaN(numericId)) {
    // Assume it's an adjunto by default (backward compatibility)
    return { type: "adjunto", numericId }
  }
  
  return null
}

/**
 * GET /api/adjuntos/[id]/image
 * Proxy endpoint to serve images from Cloudinary with authentication
 * Supports transformations via query parameters
 * 
 * ID format: "adjunto-{id}", "consentimiento-{id}", or just "{id}"
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const parsed = parseAttachmentId(id)

    if (!parsed) {
      return NextResponse.json({ error: "Invalid attachment ID format" }, { status: 400 })
    }

    // Parse query parameters for transformations
    const { searchParams } = new URL(req.url)
    const width = searchParams.get("w") ? Number.parseInt(searchParams.get("w")!) : undefined
    const height = searchParams.get("h") ? Number.parseInt(searchParams.get("h")!) : undefined
    const crop = searchParams.get("crop") || "limit"
    const quality = searchParams.get("quality") || "auto"
    const format = searchParams.get("format") || undefined
    const download = searchParams.get("download") === "true"

    let publicId: string
    let accessMode: "PUBLIC" | "AUTHENTICATED"
    let resourceType: string
    let contentType: string | null = null
    let originalFilename: string | null = null
    let fileFormat: string | null = null
    let storedSecureUrl: string | null = null
    let fileTypeInfo: FileTypeInfo

    if (parsed.type === "adjunto") {
      // Fetch adjunto from database - include secureUrl for authenticated resources
      const adjunto = await prisma.adjunto.findUnique({
        where: { idAdjunto: parsed.numericId },
        select: {
          idAdjunto: true,
          publicId: true,
          accessMode: true,
          resourceType: true,
          format: true,
          originalFilename: true,
          secureUrl: true,
          folder: true,
          isActive: true,
          pacienteId: true,
          consultaId: true,
          procedimientoId: true,
        },
      })

      if (!adjunto || !adjunto.isActive) {
        return NextResponse.json({ error: "Attachment not found" }, { status: 404 })
      }

      // TODO: Add RBAC check to verify user has access to this attachment's patient/consultation/procedure

      publicId = adjunto.publicId
      accessMode = adjunto.accessMode
      originalFilename = adjunto.originalFilename
      fileFormat = adjunto.format || null
      storedSecureUrl = adjunto.secureUrl
      
      // Use file type detection utility for accurate type detection
      // Include folder to detect PDFs based on folder path (e.g., "folder/pdf/file")
      fileTypeInfo = detectFileType({
        format: adjunto.format,
        resourceType: adjunto.resourceType,
        publicId: adjunto.publicId,
        originalFilename: adjunto.originalFilename,
        folder: adjunto.folder,
      })
      
      resourceType = fileTypeInfo.resourceType
      contentType = fileTypeInfo.mimeType
    } else {
      // Fetch consentimiento from database
      const consentimiento = await prisma.consentimiento.findUnique({
        where: { idConsentimiento: parsed.numericId },
        select: {
          idConsentimiento: true,
          public_id: true,
          secure_url: true,
          format: true,
          tipo: true,
          activo: true,
          Paciente_idPaciente: true,
        },
      })

      if (!consentimiento || !consentimiento.activo) {
        return NextResponse.json({ error: "Consentimiento not found" }, { status: 404 })
      }

      // TODO: Add RBAC check to verify user has access to this consentimiento's patient

      publicId = consentimiento.public_id
      accessMode = "PUBLIC" // Consentimientos are typically public
      fileFormat = consentimiento.format || "pdf"
      originalFilename = `consentimiento-${consentimiento.tipo}-${parsed.numericId}.${fileFormat}`
      storedSecureUrl = consentimiento.secure_url
      
      // Use file type detection for consentimientos too
      fileTypeInfo = detectFileType({
        format: consentimiento.format || "pdf",
        resourceType: "raw", // Consentimientos are typically PDFs
        publicId: consentimiento.public_id,
        originalFilename: originalFilename,
      })
      
      resourceType = fileTypeInfo.resourceType
      contentType = fileTypeInfo.mimeType
    }
    
    // Use detected resource type (already handles PDFs and other documents correctly)
    const finalResourceType = fileTypeInfo.resourceType === "auto" ? "image" : fileTypeInfo.resourceType
    
    // Update contentType if file type detection found a more accurate one
    if (!contentType || contentType === "application/octet-stream") {
      contentType = fileTypeInfo.mimeType
    }
    
    const hasTransformations = !!(width || height || format)
    let cloudinaryUrl: string

    // Build transformation options
    // Note: Transformations only work for images, not for raw files like PDFs
    const transformationOptions: Array<{
      width?: number
      height?: number
      crop?: string
      quality?: string | number
      format?: string
    }> = []
    
    // Only add transformations for images (not for raw files like PDFs)
    if (finalResourceType === "image" && (width || height || format)) {
      if (width || height) {
        transformationOptions.push({
          width,
          height,
          crop: crop === "fill" ? "fill" : crop === "limit" ? "limit" : crop === "scale" ? "scale" : "limit",
          quality: quality === "auto" ? "auto" : quality ? Number.parseInt(quality) || quality : undefined,
          format: format || undefined,
        })
      } else if (format) {
        transformationOptions.push({ format })
      }
    }

    // Generate URL based on access mode
    if (accessMode === "AUTHENTICATED") {
      // For authenticated resources, always generate a fresh signed URL
      // The stored secureUrl may have client-side authentication tokens that don't work from server
      // Generating a new signed URL ensures it works correctly from server-side
      // This is especially important for PDFs and other raw files
      
      try {
        cloudinaryUrl = await generateAuthenticatedUrl(publicId, {
          resourceType: finalResourceType as "image" | "video" | "raw",
          transformations: transformationOptions,
        })
        
        // Log URL generation for debugging
        console.log(`[API] Generated authenticated URL for ${finalResourceType}:`, {
          publicId: publicId.substring(0, 80),
          resourceType: finalResourceType,
          isPDF: fileTypeInfo.isPDF,
          isDocument: fileTypeInfo.isDocument,
          hasTransformations: transformationOptions.length > 0,
          urlLength: cloudinaryUrl.length,
        })
      } catch (urlError: any) {
        console.error(`[API] Error generating authenticated URL:`, {
          error: urlError.message,
          publicId: publicId.substring(0, 80),
          resourceType: finalResourceType,
          isPDF: fileTypeInfo.isPDF,
        })
        
        // If URL generation fails, we'll handle it in the error handling section
        throw urlError
      }
    } else {
      // For public resources, we can use stored URL if available and no transformations needed
      if (storedSecureUrl && !hasTransformations) {
        // Use stored URL if available and no transformations needed
        cloudinaryUrl = storedSecureUrl
      } else {
        // Generate public URL with transformations
        cloudinaryUrl = generatePublicUrl(publicId, {
          resourceType: finalResourceType as "image" | "video" | "raw",
          transformations: transformationOptions,
        })
      }
    }

    // Fetch the image from Cloudinary with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    let imageResponse: Response
    try {
      imageResponse = await fetch(cloudinaryUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Chomyn-Odonto/1.0",
        },
      })
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      if (fetchError.name === "AbortError") {
        console.error(`[API] Timeout fetching image from Cloudinary:`, { url: cloudinaryUrl, publicId })
        return NextResponse.json(
          { error: "Timeout fetching image" },
          { status: 504 },
        )
      }
      throw fetchError
    } finally {
      clearTimeout(timeoutId)
    }

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text().catch(() => "Unknown error")
      console.error(
        `[API] Error fetching image from Cloudinary: ${imageResponse.status} ${imageResponse.statusText}`,
        {
          publicId: publicId.substring(0, 100),
          accessMode,
          resourceType: finalResourceType,
          hasTransformations,
          urlPreview: cloudinaryUrl.substring(0, 200),
          errorBody: errorText.substring(0, 500),
        },
      )
      
      // For 401 or 404 errors with authenticated resources, try multiple fallback strategies
      if ((imageResponse.status === 401 || imageResponse.status === 404) && accessMode === "AUTHENTICATED") {
        console.log(`[API] ${imageResponse.status} error for authenticated resource, trying fallback strategies`)
        console.log(`[API] File type info:`, {
          isPDF: fileTypeInfo.isPDF,
          isDocument: fileTypeInfo.isDocument,
          resourceType: finalResourceType,
          publicId: publicId.substring(0, 80),
        })
        
        // Helper function to create response with proper headers
        const createFileResponse = (buffer: ArrayBuffer, responseContentType?: string | null) => {
          let finalContentType = contentType || fileTypeInfo.mimeType
          if (!finalContentType || finalContentType === "application/octet-stream") {
            if (responseContentType) {
              finalContentType = responseContentType
            } else {
              finalContentType = fileTypeInfo.mimeType
            }
          }
          
          const responseHeaders: Record<string, string> = {
            "Content-Type": finalContentType,
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
            "Content-Length": String(buffer.byteLength),
          }
          
          const baseName = parsed.type === "adjunto" 
            ? `adjunto-${parsed.numericId}`
            : `consentimiento-${parsed.numericId}`
          
          const filename = getFilenameWithExtension(originalFilename, fileTypeInfo, baseName)
          const sanitizedFilename = sanitizeFilename(filename)
          
          if (download) {
            responseHeaders["Content-Disposition"] = `attachment; filename="${sanitizedFilename}"`
          } else {
            if (fileTypeInfo.isPDF || fileTypeInfo.isImage || fileTypeInfo.isVideo) {
              responseHeaders["Content-Disposition"] = `inline; filename="${sanitizedFilename}"`
            } else {
              responseHeaders["Content-Disposition"] = `attachment; filename="${sanitizedFilename}"`
            }
          }
          
          return new NextResponse(buffer, {
            headers: responseHeaders,
          })
        }
        
        // Strategy 1: Try stored secureUrl if available and no transformations
        // This is often the most reliable for PDFs and other raw files
        if (storedSecureUrl && !hasTransformations) {
          console.log(`[API] Fallback strategy 1: Trying stored secureUrl`)
          try {
            const fallbackController = new AbortController()
            const fallbackTimeout = setTimeout(() => fallbackController.abort(), 30000)
            
            const fallbackResponse = await fetch(storedSecureUrl, {
              signal: fallbackController.signal,
              headers: {
                "User-Agent": "Chomyn-Odonto/1.0",
              },
            })
            
            clearTimeout(fallbackTimeout)
            
            if (fallbackResponse.ok) {
              console.log(`[API] Stored secureUrl fallback successful`)
              const fallbackBuffer = await fallbackResponse.arrayBuffer()
              return createFileResponse(fallbackBuffer, fallbackResponse.headers.get("content-type"))
            } else {
              console.log(`[API] Stored secureUrl returned ${fallbackResponse.status}, trying next strategy`)
            }
          } catch (fallbackError) {
            console.error(`[API] Stored secureUrl fallback failed:`, fallbackError)
          }
        }
        
        // Strategy 2: Regenerate signed URL without transformations
        // This creates a fresh signed URL that should work for authenticated resources
        console.log(`[API] Fallback strategy 2: Regenerating signed URL without transformations`)
        try {
          const fallbackUrl = await generateAuthenticatedUrl(publicId, {
            resourceType: finalResourceType as "image" | "video" | "raw",
            transformations: [], // No transformations - most compatible
          })
          
          console.log(`[API] Regenerated URL (no transformations):`, {
            urlLength: fallbackUrl.length,
            resourceType: finalResourceType,
            isPDF: fileTypeInfo.isPDF,
          })
          
          const fallbackController = new AbortController()
          const fallbackTimeout = setTimeout(() => fallbackController.abort(), 30000)
          
          const fallbackResponse = await fetch(fallbackUrl, {
            signal: fallbackController.signal,
            headers: {
              "User-Agent": "Chomyn-Odonto/1.0",
            },
          })
          
          clearTimeout(fallbackTimeout)
          
          if (fallbackResponse.ok) {
            console.log(`[API] Regenerated URL fallback successful`)
            const fallbackBuffer = await fallbackResponse.arrayBuffer()
            return createFileResponse(fallbackBuffer, fallbackResponse.headers.get("content-type"))
          } else {
            console.error(`[API] Regenerated URL also failed: ${fallbackResponse.status} ${fallbackResponse.statusText}`)
          }
        } catch (fallbackError: any) {
          console.error(`[API] Regenerated URL fallback failed:`, fallbackError.message)
        }
        
        // Strategy 3: For PDFs specifically, try using storedSecureUrl even if it failed before
        // The storedSecureUrl from Cloudinary upload response may work even when regenerated URLs don't
        if (fileTypeInfo.isPDF && storedSecureUrl && !hasTransformations) {
          console.log(`[API] Fallback strategy 3: Trying storedSecureUrl for PDF (even if it was the original URL)`)
          try {
            const pdfController = new AbortController()
            const pdfTimeout = setTimeout(() => pdfController.abort(), 30000)
            
            // Try the storedSecureUrl - it may work even if the generated URL doesn't
            const pdfResponse = await fetch(storedSecureUrl, {
              signal: pdfController.signal,
              headers: {
                "User-Agent": "Chomyn-Odonto/1.0",
                // Add authorization header if the URL requires it
                // Some Cloudinary URLs work with just the signature in the URL
              },
            })
            
            clearTimeout(pdfTimeout)
            
            if (pdfResponse.ok) {
              console.log(`[API] Stored secureUrl for PDF successful`)
              const pdfBuffer = await pdfResponse.arrayBuffer()
              return createFileResponse(pdfBuffer, pdfResponse.headers.get("content-type"))
            } else {
              console.log(`[API] Stored secureUrl for PDF returned ${pdfResponse.status}`)
            }
          } catch (pdfError) {
            console.error(`[API] Stored secureUrl for PDF failed:`, pdfError)
          }
        }
        
        // Strategy 4: Try using Admin API to verify resource exists and get correct URL format
        // This is a last resort - it's slower but more reliable
        if (fileTypeInfo.isPDF || fileTypeInfo.isDocument) {
          console.log(`[API] Fallback strategy 4: Attempting to verify resource with Admin API`)
          try {
            // Use Admin API to get resource info - this will tell us if it exists and what the correct format is
            const resourceInfo = await cloudinary.api.resource(publicId, {
              resource_type: finalResourceType,
              type: "authenticated",
            })
            
            if (resourceInfo) {
              console.log(`[API] Resource exists in Cloudinary, attempting direct access`)
              // Resource exists - try using the secure_url from the resource info
              if (resourceInfo.secure_url) {
                const directController = new AbortController()
                const directTimeout = setTimeout(() => directController.abort(), 30000)
                
                const directResponse = await fetch(resourceInfo.secure_url, {
                  signal: directController.signal,
                  headers: {
                    "User-Agent": "Chomyn-Odonto/1.0",
                  },
                })
                
                clearTimeout(directTimeout)
                
                if (directResponse.ok) {
                  console.log(`[API] Direct access via Admin API URL successful`)
                  const directBuffer = await directResponse.arrayBuffer()
                  return createFileResponse(directBuffer, directResponse.headers.get("content-type"))
                }
              }
            }
          } catch (adminError: any) {
            // Admin API may fail if resource doesn't exist or API key doesn't have permissions
            console.error(`[API] Admin API verification failed:`, adminError.message)
          }
        }
      }
      
      // Return error response
      if (imageResponse.status === 404) {
        return NextResponse.json(
          { 
            error: "File not found in Cloudinary",
            details: "The file may have been deleted from Cloudinary or the publicId is incorrect.",
          },
          { status: 404 },
        )
      }
      
      if (imageResponse.status === 401) {
        return NextResponse.json(
          { 
            error: "Unauthorized access to file",
            details: "The file requires authentication and the signed URL may be invalid or expired.",
          },
          { status: 401 },
        )
      }
      
      return NextResponse.json(
        { 
          error: "Error fetching file from Cloudinary",
          status: imageResponse.status,
          statusText: imageResponse.statusText,
        },
        { status: imageResponse.status },
      )
    }

    // Get the file data
    const fileBuffer = await imageResponse.arrayBuffer()
    
    // Determine content type - prioritize file type detection, then response headers
    let finalContentType = contentType || fileTypeInfo.mimeType
    if (!finalContentType || finalContentType === "application/octet-stream") {
      const responseContentType = imageResponse.headers.get("content-type")
      if (responseContentType) {
        finalContentType = responseContentType
      } else {
        // Use file type info as final fallback
        finalContentType = fileTypeInfo.mimeType
      }
    }

    // Build response headers
    const headers: Record<string, string> = {
      "Content-Type": finalContentType,
      "Cache-Control": "public, max-age=3600, s-maxage=3600", // Cache for 1 hour
      "Content-Length": String(fileBuffer.byteLength),
    }

    // Add download/inline header
    const baseName = parsed.type === "adjunto" 
      ? `adjunto-${parsed.numericId}`
      : `consentimiento-${parsed.numericId}`
    
    const filename = getFilenameWithExtension(originalFilename, fileTypeInfo, baseName)
    const sanitizedFilename = sanitizeFilename(filename)
    
    if (download) {
      // Force download
      headers["Content-Disposition"] = `attachment; filename="${sanitizedFilename}"`
    } else {
      // For inline display (PDFs, images, videos)
      if (fileTypeInfo.isPDF || fileTypeInfo.isImage || fileTypeInfo.isVideo) {
        headers["Content-Disposition"] = `inline; filename="${sanitizedFilename}"`
      } else {
        // For other documents, suggest download
        headers["Content-Disposition"] = `attachment; filename="${sanitizedFilename}"`
      }
    }

    // Return the file with proper headers
    return new NextResponse(fileBuffer, {
      headers,
    })
  } catch (error) {
    console.error("[API] Error serving image:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

