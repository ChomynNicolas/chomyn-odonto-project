export function splitNombreCompleto(nombreCompleto: string) {
  const parts = nombreCompleto.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    return { nombres: parts[0], apellidos: "", segundoApellido: null }
  }
  if (parts.length === 2) {
    return { nombres: parts[0], apellidos: parts[1], segundoApellido: null }
  }
  // 3+ words: last 2 are last names (apellidos + segundoApellido)
  const segundoApellido = parts.pop()!
  const apellidos = parts.pop()!
  return { nombres: parts.join(" "), apellidos, segundoApellido }
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
