import { NextResponse } from "next/server"
import { auth } from "@/auth"

export default async function middleware(req: Request) {
  const url = new URL(req.url)
  const path = url.pathname

  // Rutas públicas
  if (path.startsWith("/signin") || path.startsWith("/api/auth")) {
    return NextResponse.next()
  }

  const session = await auth()
  if (!session?.user) {
    return NextResponse.redirect(new URL("/signin", url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
