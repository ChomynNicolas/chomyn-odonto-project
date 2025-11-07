"use client"

import type { PatientKPIs } from "@/lib/types/patient"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar, Paperclip, Stethoscope, AlertTriangle, Pill } from "lucide-react"

interface PatientKPIsProps {
  kpis: PatientKPIs
}

export function PatientKPIsCard({ kpis }: PatientKPIsProps) {
  const stats = [
    {
      label: "Citas",
      value: kpis.totalAppointments,
      icon: Calendar,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Adjuntos",
      value: kpis.totalAttachments,
      icon: Paperclip,
      color: "text-purple-600 dark:text-purple-400",
    },
    {
      label: "Diagnósticos",
      value: kpis.activeDiagnoses,
      icon: Stethoscope,
      color: "text-green-600 dark:text-green-400",
    },
    {
      label: "Alergias",
      value: kpis.activeAllergies,
      icon: AlertTriangle,
      color: "text-orange-600 dark:text-orange-400",
    },
    {
      label: "Medicación",
      value: kpis.activeMedications,
      icon: Pill,
      color: "text-red-600 dark:text-red-400",
    },
  ]

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="mb-4 text-lg font-semibold">Resumen Clínico</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="flex flex-col items-center text-center">
                <div className={`mb-2 rounded-full bg-muted p-3 ${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
