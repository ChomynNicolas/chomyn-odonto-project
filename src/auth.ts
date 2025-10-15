
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import prisma from "@/lib/prisma"
import { z } from "zod"


const CredentialsSchema = z.object({
  usuario: z.string().min(1, "usuario requerido"),
  password: z.string().min(1, "password requerido")
})

type AppRole = "ADMIN" | "ODONT" | "RECEP"
type UserWithRole = {
  id: string
  name?: string | null
  email?: string | null
  role: AppRole
  username?: string
}




export const {
  // ✅ export the real HTTP handlers
  handlers: { GET, POST },
  // helpers
  auth, signIn, signOut,
} = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" }, // or /login — make sure it matches your route
  providers: [
    Credentials({
      name: "Credenciales",
      id: "credentials", // must match the id used in signIn("credentials")
      credentials: {
        usuario: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(creds) {

        const parsed = CredentialsSchema.safeParse(creds)

        if (!parsed.success) return null
        const { usuario, password } = parsed.data

        const dbUser = await prisma.usuario.findUnique({
          where: { usuario: usuario.toLowerCase() },
          include: { rol: true },
        })
        if (!dbUser) return null

        const ok = await bcrypt.compare(password, dbUser.passwordHash)
        if (!ok) return null

        // ✅ Devuelve un "UserWithRole" estricto (sin any)
        const user: UserWithRole = {
          id: String(dbUser.idUsuario),
          name: dbUser.nombreApellido ?? null,
          email: dbUser.email ?? undefined,
          role: dbUser.rol.nombreRol as AppRole,
          username: dbUser.usuario,
        }
        return user
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as Partial<UserWithRole>
        if (u.role) token.role = u.role
        if (u.username) token.username = u.username
      }
      return token
    },
    async session({ session, token }) {
      // session.user.id lo marcamos como opcional en la augmentación (ver paso 2)
      if (session.user) {
        // evita "any" especificando campos
        (session.user as { role?: AppRole }).role = token.role as AppRole | undefined
        ;(session.user as { username?: string }).username = token.username as string | undefined
        if (typeof token.sub === "string") {
          // asigna sólo si existe (evita error 'string | undefined')
          ;(session.user as { id?: string }).id = token.sub
        }
      }
      return session
    },
  },
})
