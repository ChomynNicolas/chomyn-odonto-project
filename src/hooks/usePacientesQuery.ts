"use client";

import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { fetchPacientes } from "@/lib/api/pacientes.client";
import { useMemo } from "react";

export function usePacientes({ q, soloActivos = true, limit = 20 }: { q: string; soloActivos?: boolean; limit?: number; }) {
  // infinite query con cursor
  const query = useInfiniteQuery({
    queryKey: ["pacientes", { q, soloActivos, limit }],
    queryFn: ({ pageParam, signal }) =>
      fetchPacientes({ q, limit, cursor: pageParam ?? null, soloActivos, signal }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    keepPreviousData: true,
  });

  const flat = useMemo(() => (query.data?.pages ?? []).flatMap(p => p.items), [query.data]);
  const hasMore = !!query.data?.pages?.[query.data.pages.length - 1]?.nextCursor;

  return { ...query, items: flat, hasMore };
}
