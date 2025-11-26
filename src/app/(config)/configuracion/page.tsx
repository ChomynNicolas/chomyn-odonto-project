import { redirect } from "next/navigation"
import { DEFAULT_CONFIG_ROUTE } from "@/lib/config/navigation"

export default function ConfiguracionPage() {
  redirect(DEFAULT_CONFIG_ROUTE)
}

