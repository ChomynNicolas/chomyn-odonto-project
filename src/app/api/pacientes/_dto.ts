export function splitNombreCompleto(nombreCompleto: string) {
  const parts = nombreCompleto.trim().split(/\s+/)
  if (parts.length === 1) return { nombres: parts[0], apellidos: "" }
  const apellidos = parts.pop()!
  return { nombres: parts.join(" "), apellidos }
}

export function mapGeneroToDB(g: string) {
  const mapping: Record<string, string> = {
    M: "MASCULINO",
    F: "FEMENINO",
    X: "NO_ESPECIFICADO",
    MASCULINO: "MASCULINO",
    FEMENINO: "FEMENINO",
    OTRO: "OTRO",
    NO_ESPECIFICADO: "NO_ESPECIFICADO",
  }
  return mapping[g] || "NO_ESPECIFICADO"
}

export type CrearPacienteTxResult = { idPaciente: number; personaId: number }
