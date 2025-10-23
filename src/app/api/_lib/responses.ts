// responses.ts
export function ok<T>(data: T){ return { ok: true, data }; }
export function fail(message: string, details?: any){ return { ok: false, error: message, details }; }
