// ListMobile.tsx
"use client";

import type { PacienteItem } from "@/lib/api/pacientes.types";
import { CardMobile } from "./RowCells";

export default function ListMobile({ data }: { data: PacienteItem[] }) {
  return <ul className="sm:hidden space-y-3">{data.map((p) => <CardMobile key={p.idPaciente} p={p} />)}</ul>;
}
