"use client"

import Checkbox from "@/components/form/input/Checkbox"

type Value = {
  whatsapp?: boolean
  llamada?: boolean
  email?: boolean
  sms?: boolean
}

export default function PreferenciasContacto({
  value,
  onChange,
}: {
  value: Value
  onChange: (v: Value) => void
}) {
  const v = { whatsapp: true, llamada: false, email: false, sms: false, ...value }
  const toggle = (k: keyof Value) => onChange({ ...v, [k]: !v[k] })

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={v.whatsapp} onChange={() => toggle("whatsapp")} />
        <span>WhatsApp</span>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={v.llamada} onChange={() => toggle("llamada")} />
        <span>Llamada</span>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={v.email} onChange={() => toggle("email")} />
        <span>Email</span>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={v.sms} onChange={() => toggle("sms")} />
        <span>SMS</span>
      </label>
    </div>
  )
}
