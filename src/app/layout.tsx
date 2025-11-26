// src/app/layout.tsx
import localFont from "next/font/local"
import "./globals.css"
import { Providers } from "./providers"
import { auth } from "@/auth"
import { Toaster } from "@/components/ui/sonner"

const outfit = localFont({
  src: [
    {
      path: "../fonts/Outfit-Thin.woff2",
      weight: "100",
      style: "normal",
    },
    {
      path: "../fonts/Outfit-ExtraLight.woff2",
      weight: "200",
      style: "normal",
    },
    {
      path: "../fonts/Outfit-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../fonts/Outfit-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/Outfit-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/Outfit-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../fonts/Outfit-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../fonts/Outfit-ExtraBold.woff2",
      weight: "800",
      style: "normal",
    },
    {
      path: "../fonts/Outfit-Black.woff2",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-outfit",
  display: "swap",
  fallback: ["system-ui", "arial", "sans-serif"],
})

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth() // ✅ ahora sí es una función
  return (
    <html lang="es">
      <body className={`${outfit.className} dark:bg-gray-900`}>
        <Providers initialSession={session}>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  )
}
