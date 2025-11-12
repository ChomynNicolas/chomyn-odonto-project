"use client"

import Label from "@/components/form/Label"
import Button from "@/components/ui/button/Button"
import Image from "next/image"

export default function SignupForm() {
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault() // sin lógica todavía
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
            <h1 className="text-2xl font-semibold tracking-tight">Crear cuenta</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Completa los datos para registrar un usuario.
            </p>
          </div>

          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <div>
              <Label htmlFor="nombre">Nombre y apellido <span className="text-destructive">*</span></Label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                placeholder="Dra. Vera López"
                required
                className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div>
              <Label htmlFor="usuario">Usuario <span className="text-destructive">*</span></Label>
              <input
                id="usuario"
                name="usuario"
                type="text"
                autoComplete="username"
                placeholder="ej: dra.vera"
                required
                className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div>
              <Label htmlFor="email">Correo (opcional)</Label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="usuario@clinica.com"
                className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div>
              <Label htmlFor="password">Contraseña <span className="text-destructive">*</span></Label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="Mínimo 8 caracteres"
                className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div>
              <Label htmlFor="password2">Confirmar contraseña <span className="text-destructive">*</span></Label>
              <input
                id="password2"
                name="password2"
                type="password"
                autoComplete="new-password"
                required
                className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <Button className="w-full">Crear cuenta</Button>
          </form>

          
        </div>
      </div>
    </div>
  )
}
