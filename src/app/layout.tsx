// src/app/layout.tsx
import { Outfit } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"
import { auth } from "@/auth"

const outfit = Outfit({ subsets: ["latin"] })

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth() // ✅ ahora sí es una función
  return (
    <html lang="es">
      <body className={`${outfit.className} dark:bg-gray-900`}>
        <Providers initialSession={session}>
          {children}
        </Providers>
      </body>
    </html>
  )
}
