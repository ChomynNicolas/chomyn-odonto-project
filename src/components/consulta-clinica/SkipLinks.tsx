"use client"

export function SkipLinks() {
  return (
    <div className="sr-only focus-within:not-sr-only focus-within:fixed focus-within:top-0 focus-within:left-0 focus-within:z-[100] focus-within:p-4 focus-within:bg-background">
      <a
        href="#workspace-content"
        className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        Saltar al contenido principal
      </a>
      <a
        href="#workspace-nav"
        className="inline-block px-4 py-2 ml-2 bg-primary text-primary-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        Saltar a navegación
      </a>
    </div>
  )
}
