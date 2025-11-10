// src/app/api/pacientes/_tx.ts
import { prisma } from "@/lib/prisma"

export async function withTxRetry<T>(
  fn: (tx: Parameters<typeof prisma.$transaction>[0] extends (arg: infer U)=>any ? U : never) => Promise<T>,
  opts?: { maxWaitMs?: number; timeoutMs?: number; attempts?: number }
): Promise<T> {
  const attempts = opts?.attempts ?? 2
  const maxWait = opts?.maxWaitMs ?? 10_000   // espera hasta 10s un slot
  const timeout = opts?.timeoutMs ?? 45_000   // dura máx 45s
  let lastError: any
  for (let i = 0; i < attempts; i++) {
    try {
      return await prisma.$transaction(async (tx) => fn(tx), { maxWait, timeout })
    } catch (e: any) {
      lastError = e
      if (e?.code === "P2028" && i < attempts - 1) {
        // backoff simple 250–500 ms y reintenta
        await new Promise((r) => setTimeout(r, 250 + Math.random() * 250))
        continue
      }
      throw e
    }
  }
  throw lastError
}
