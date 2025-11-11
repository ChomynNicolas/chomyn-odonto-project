// React hook for managing patient attachments

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Attachment, AttachmentType } from "@/lib/types/patient"
import { fetchAttachments, createAttachment, deleteAttachment, type FetchAttachmentsParams } from "@/lib/api/attachments-api"
import { toast } from "sonner"

/**
 * Hook to fetch patient attachments with infinite scroll
 */
export function useAttachments(params: Omit<FetchAttachmentsParams, "page">) {
  return useInfiniteQuery({
    queryKey: ["attachments", params.pacienteId, params.tipo, params.search, params.limit],
    queryFn: ({ pageParam = 1 }) => fetchAttachments({ ...params, page: pageParam }),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination
      return page < totalPages ? page + 1 : undefined
    },
    initialPageParam: 1,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Hook to fetch patient attachments with pagination (legacy, for backward compatibility)
 */
export function useAttachmentsPaginated(params: FetchAttachmentsParams) {
  return useQuery({
    queryKey: ["attachments", params.pacienteId, params.tipo, params.search, params.page, params.limit],
    queryFn: () => fetchAttachments(params),
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Hook to create a new attachment
 */
export function useCreateAttachment(pacienteId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: Parameters<typeof createAttachment>[0]) => createAttachment(params),
    onSuccess: () => {
      // Invalidate attachments query to refetch
      queryClient.invalidateQueries({ queryKey: ["attachments", pacienteId] })
      // Also invalidate patient record query
      queryClient.invalidateQueries({ queryKey: ["patient", pacienteId] })
      toast.success("Adjunto subido", {
        description: "El archivo se ha subido correctamente",
      })
    },
    onError: (error: Error) => {
      toast.error("Error al subir adjunto", {
        description: error.message,
      })
    },
  })
}

/**
 * Hook to delete an attachment
 */
export function useDeleteAttachment(pacienteId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (attachmentId: string) => deleteAttachment(pacienteId, attachmentId),
    onSuccess: () => {
      // Invalidate attachments query to refetch
      queryClient.invalidateQueries({ queryKey: ["attachments", pacienteId] })
      // Also invalidate patient record query
      queryClient.invalidateQueries({ queryKey: ["patient", pacienteId] })
      toast.success("Adjunto eliminado", {
        description: "El archivo se ha eliminado correctamente",
      })
    },
    onError: (error: Error) => {
      toast.error("Error al eliminar adjunto", {
        description: error.message,
      })
    },
  })
}

