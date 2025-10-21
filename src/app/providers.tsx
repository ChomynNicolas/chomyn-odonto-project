"use client"

import * as React from "react"
import type { Session } from "next-auth"
import { SessionProvider } from "next-auth/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { SidebarProvider } from "@/context/SidebarContext"
import { ThemeProvider } from "@/context/ThemeContext"

type ProvidersProps = {
  children: React.ReactNode
  initialSession?: Session | null
}

export function Providers({ children, initialSession }: ProvidersProps) {

  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error: any) =>
          error?.status === 404 ? false : failureCount < 2,
      },
    },
  }));

  return (
    <SessionProvider session={initialSession}>
      <ThemeProvider>
        <SidebarProvider>
          <QueryClientProvider client={client}>
          {children}
          </QueryClientProvider>
          </SidebarProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
