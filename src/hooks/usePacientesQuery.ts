// src/hooks/usePacientesQuery.ts
import { useInfiniteQuery, type QueryFunctionContext } from "@tanstack/react-query";
import type {
  PacientesQueryParams,
  PacientesResponse,
  SortPacientes,
} from "@/lib/api/pacientes.types";

/** ===== Util: construir URLSearchParams de forma segura ===== */
function buildSearchParams(params: PacientesQueryParams & { limit?: number; cursor?: number }) {
  const sp = new URLSearchParams();

  // Texto
  if (params.q?.trim()) sp.set("q", params.q.trim());

  // Booleans
  if (params.soloActivos !== undefined) sp.set("soloActivos", String(params.soloActivos));
  if (params.hasEmail !== undefined) sp.set("hasEmail", String(params.hasEmail));
  if (params.hasPhone !== undefined) sp.set("hasPhone", String(params.hasPhone));

  // Numbers
  if (params.limit && params.limit > 0) sp.set("limit", String(params.limit));
  if (params.cursor) sp.set("cursor", String(params.cursor));

  // Enums/strings
  if (params.genero) sp.set("genero", params.genero);
  if (params.createdFrom) sp.set("createdFrom", params.createdFrom); // YYYY-MM-DD
  if (params.createdTo) sp.set("createdTo", params.createdTo);       // YYYY-MM-DD
  if (params.sort) sp.set("sort", params.sort as SortPacientes);

  return sp;
}

/** ===== Fetcher con soporte de cancelación (React Query signal) ===== */
async function fetchPacientes(
  ctx: QueryFunctionContext<[string, PacientesQueryParams], number | undefined>
): Promise<PacientesResponse> {
  const [, baseParams] = ctx.queryKey;
  const cursor = ctx.pageParam;
  const sp = buildSearchParams({ ...baseParams, cursor });

  const res = await fetch(`/api/pacientes?${sp.toString()}`, {
    cache: "no-store",
    // @ts-expect-error — React Query inyecta signal en context, los runtimes modernos lo soportan
    signal: (ctx as any).signal,
  });

  if (!res.ok) {
    // Intenta exponer mensaje del backend
    let msg = "Error al cargar pacientes";
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  return res.json();
}

/** ===== Hook público ===== */
export function usePacientes(params: PacientesQueryParams & { limit?: number } = {}) {
  const {
    q = "",
    soloActivos = true,
    limit = 20,
    genero,
    hasEmail,
    hasPhone,
    createdFrom,
    createdTo,
    sort = "createdAt desc",
  } = params;

  // Usamos un objeto estable en el queryKey para evitar invalidaciones por orden de argumentos.
  const queryKey: [string, PacientesQueryParams] = [
    "pacientes",
    { q, soloActivos, limit, genero, hasEmail, hasPhone, createdFrom, createdTo, sort },
  ];

  const query = useInfiniteQuery({
    queryKey,
    queryFn: (ctx) => fetchPacientes(ctx),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    // Mantiene páginas previas visibles mientras llegan nuevas (lista fluida).
    keepPreviousData: true,
    // Este endpoint es dinámico (agenda/estado). Evitamos cachear de más.
    staleTime: 0,
    // Reintentos ligeros ante errores transitorios de red.
    retry: 2,
  });

  // Flatten de resultados
  const pages = query.data?.pages ?? [];
  const items = pages.flatMap((p) => p.items);
  const hasMore = pages.at(-1)?.hasMore ?? false;
  // totalCount viene redundante en cada página, nos quedamos con la primera
  const totalCount = pages[0]?.totalCount ?? 0;

  return {
    /** Datos */
    items,
    totalCount,
    hasMore,
    /** Paginación */
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    /** Estado */
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error as Error | null,
    /** Utilidades */
    refetch: query.refetch,
  };
}
