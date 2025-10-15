"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import Label from "@/components/form/Label"
import Button from "@/components/ui/button/Button"
import Image from "next/image"

export default  function SignInForm() {

  
  const router = useRouter()
  const [usuario, setUsuario] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const res = await signIn("credentials", {
      usuario,
      password,
      redirect: false,        // manejamos redirección manual
      callbackUrl: "/",       // a dónde vas al loguear
    })
    setLoading(false)
    if (res?.error) {
      setError("Usuario o contraseña incorrectos.")
      return
    }
    router.push("/")
    router.refresh()
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-background">
      {/* Imagen izquierda */}
      <div className="relative hidden lg:block">
        <Image
          src="https://img.freepik.com/fotos-premium/imagen-fondo_910766-187.jpg?w=826"
          alt="Clínica odontológica"
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          width={1000}
          height={1000}
        />
        <div className="absolute inset-0 bg-sky-900/10" />
      </div>

      {/* Formulario */}
      <div className="flex items-center justify-center p-6 sm:p-10 lg:p-16">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">Iniciar sesión</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Ingresa tu usuario y contraseña para acceder al sistema.
            </p>
          </div>

          <form onSubmit={onSubmit} noValidate className="space-y-5">
            <div>
              <Label htmlFor="usuario">Usuario <span className="text-destructive">*</span></Label>
              <input
                id="usuario"
                name="usuario"
                type="text"
                autoComplete="username"
                placeholder="ej: recep.sosa"
                required
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div>
              <Label htmlFor="password">Contraseña <span className="text-destructive">*</span></Label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Tu contraseña"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button className="w-full" disabled={loading}>
              {loading ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
