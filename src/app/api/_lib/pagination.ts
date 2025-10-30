// app/api/_lib/pagination.ts
export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(n, max));
}

export function toPageLimit(params: { page?: number; limit?: number }) {
  const page = clamp(Number(params.page || 1), 1, 10_000);
  const limit = clamp(Number(params.limit || 20), 1, 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
