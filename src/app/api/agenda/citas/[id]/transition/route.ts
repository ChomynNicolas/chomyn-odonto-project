// src/app/api/agenda/citas/[id]/transition/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma as db } from "@/lib/prisma";
import { requireSessionWithRoles } from "../../../_lib/auth";

export const revalidate = 0;

const paramsSchema = z.object({ id: z.string().regex(/^\d+$/).transform(Number) });
const bodySchema = z.object({
  action: z.enum(["CONFIRM","CHECKIN","START","COMPLETE","CANCEL","NO_SHOW"]),
  note: z.string().max(1000).optional(),
});

const allowedByState: Record<string, string[]> = {
  SCHEDULED: ["CONFIRM","CANCEL","NO_SHOW","CHECKIN","START"],
  CONFIRMED: ["CHECKIN","START","CANCEL","NO_SHOW"],
  CHECKED_IN: ["START","CANCEL"],
  IN_PROGRESS: ["COMPLETE","CANCEL"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};
const rbacDeniedForRecep = new Set(["START","COMPLETE"]);

function nextState(curr: string, action: string): string | null {
  const map: Record<string, Record<string, string>> = {
    SCHEDULED: { CONFIRM:"CONFIRMED", CHECKIN:"CHECKED_IN", START:"IN_PROGRESS", CANCEL:"CANCELLED", NO_SHOW:"NO_SHOW" },
    CONFIRMED: { CHECKIN:"CHECKED_IN", START:"IN_PROGRESS", CANCEL:"CANCELLED", NO_SHOW:"NO_SHOW" },
    CHECKED_IN: { START:"IN_PROGRESS", CANCEL:"CANCELLED" },
    IN_PROGRESS: { COMPLETE:"COMPLETED", CANCEL:"CANCELLED" },
  } as any;
  return map[curr]?.[action] ?? null;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSessionWithRoles(req, ["RECEP","ODONT","ADMIN"]);
  if (!auth.authorized) return NextResponse.json({ ok:false, error:auth.error }, { status: auth.status });

  const p = paramsSchema.safeParse(await params);
  if (!p.success) return NextResponse.json({ ok:false, error:"BAD_REQUEST" }, { status:400 });

  const b = bodySchema.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ ok:false, error:"BAD_REQUEST" }, { status:400 });

  const cita = await db.cita.findUnique({ where: { idCita: p.data.id }, select: { idCita:true, estado:true } });
  if (!cita) return NextResponse.json({ ok:false, error:"NOT_FOUND" }, { status:404 });

  // RBAC
  const role = (auth.session.user as any)?.rol ?? (auth.session.user as any)?.role;
  if (role === "RECEP" && rbacDeniedForRecep.has(b.data.action)) {
    return NextResponse.json({ ok:false, error:"FORBIDDEN" }, { status:403 });
  }

  // Allowed?
  const allowed = allowedByState[cita.estado] ?? [];
  if (!allowed.includes(b.data.action)) return NextResponse.json({ ok:false, error:"INVALID_TRANSITION" }, { status:409 });

  const newState = nextState(cita.estado, b.data.action);
  if (!newState) return NextResponse.json({ ok:false, error:"INVALID_TRANSITION" }, { status:409 });

  await db.$transaction(async (tx) => {
    await tx.cita.update({ where: { idCita: cita.idCita }, data: { estado: newState as any } });
    await tx.citaEstadoHistorial.create({
      data: {
        citaId: cita.idCita,
        estadoPrevio: cita.estado as any,
        estadoNuevo: newState as any,
        nota: b.data.note ?? null,
        changedAt: new Date(),
        changedByUserId: (auth.session.user as any)?.idUsuario ?? null,
      },
    });
  });

  return NextResponse.json({ ok:true, data: { idCita: cita.idCita, estado: newState } });
}
