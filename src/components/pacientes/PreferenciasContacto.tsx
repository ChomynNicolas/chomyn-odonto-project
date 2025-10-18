"use client";

import Checkbox from "../form/input/Checkbox";

type Value = { whatsapp?: boolean; llamada?: boolean; email?: boolean; sms?: boolean; };
export default function PreferenciasContacto({ value, onChange }: { value: Value, onChange: (v: Value)=>void }) {
  const v = { whatsapp: true, llamada: false, email: false, sms: false, ...value };
  const toggle = (k: keyof Value) => onChange({ ...v, [k]: !v[k] });
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <label className="flex items-center gap-2"><Checkbox checked={v.whatsapp} onChange={()=>toggle("whatsapp")} /><span>WhatsApp</span></label>
      <label className="flex items-center gap-2"><Checkbox checked={v.llamada} onChange={()=>toggle("llamada")} /><span>Llamada</span></label>
      <label className="flex items-center gap-2"><Checkbox checked={v.email} onChange={()=>toggle("email")} /><span>Email</span></label>
      <label className="flex items-center gap-2"><Checkbox checked={v.sms} onChange={()=>toggle("sms")} /><span>SMS</span></label>
    </div>
  );
}
