// errors.ts
export class HttpError extends Error {
  status: number; details?: any;
  constructor(status: number, message: string, details?: any) { super(message); this.status = status; this.details = details; }
}
export class BadRequestError extends HttpError { constructor(msg="Datos inválidos", d?:any){ super(400, msg, d);} }
export class UnauthenticatedError extends HttpError { constructor(msg="No autenticado"){ super(401, msg);} }
export class UnauthorizedError extends HttpError { constructor(msg="No autorizado"){ super(403, msg);} }
export class NotFoundError extends HttpError { constructor(msg="Recurso no encontrado"){ super(404, msg);} }
export class ConflictError extends HttpError { constructor(msg="Conflicto"){ super(409, msg);} }
