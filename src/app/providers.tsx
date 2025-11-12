"use client"

import type * as React from "react"
import type { Session } from "next-auth"
import { SessionProvider } from "next-auth/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SWRConfig } from "swr"
import { useState } from "react"
import { SidebarProvider } from "@/context/SidebarContext"
import { ThemeProvider } from "@/context/ThemeContext"

type ProvidersProps = {
  children: React.ReactNode
  initialSession?: Session | null
}

export function Providers({ children, initialSession }: ProvidersProps) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error: unknown) => {
              const status = (error as { status?: number })?.status;
              return status === 404 ? false : failureCount < 2;
            },
          },
        },
      }),
  )

  return (
    <SessionProvider session={initialSession}>
      <ThemeProvider>
        <SidebarProvider>
          <QueryClientProvider client={client}>
            <SWRConfig
              value={{
                dedupingInterval: 60000, // 1 minute - dedupe identical requests
                focusThrottleInterval: 300000, // 5 minutes - throttle revalidation
                revalidateOnFocus: false, // Don't revalidate on window focus
                revalidateOnReconnect: true, // Revalidate on network reconnect
                shouldRetryOnError: true, // Retry on error
                errorRetryCount: 2, // Max 2 retries
                errorRetryInterval: 5000, // 5 seconds between retries
                keepPreviousData: true, // Keep previous data while revalidating
                provider: () => new Map(), // Use Map for cache storage
              }}
            >
              {children}
            </SWRConfig>
          </QueryClientProvider>
        </SidebarProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
