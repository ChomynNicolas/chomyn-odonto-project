"use client"

import * as React from "react"
import type { Session } from "next-auth"
import { SessionProvider } from "next-auth/react"

import { SidebarProvider } from "@/context/SidebarContext"
import { ThemeProvider } from "@/context/ThemeContext"

type ProvidersProps = {
  children: React.ReactNode
  initialSession?: Session | null
}

export function Providers({ children, initialSession }: ProvidersProps) {
  return (
    <SessionProvider session={initialSession}>
      <ThemeProvider>
        <SidebarProvider>{children}</SidebarProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
