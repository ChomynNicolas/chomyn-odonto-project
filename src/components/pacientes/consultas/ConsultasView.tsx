"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, FileText, Plus, Stethoscope } from "lucide-react"
import { ConsultasList } from "./ConsultasList"
import { ProcedimientosList } from "./ProcedimientosList"
import { AddConsultaDialog } from "./AddConsultaDialog"

interface ConsultasViewProps {
  pacienteId: string
}

export function ConsultasView({ pacienteId }: ConsultasViewProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [activeTab, setActiveTab] = useState("consultas")

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                Registro Clínico
              </CardTitle>
              <CardDescription>Consultas realizadas y procedimientos aplicados al paciente</CardDescription>
            </div>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Consulta
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="consultas" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Consultas
              </TabsTrigger>
              <TabsTrigger value="procedimientos" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Procedimientos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="consultas" className="mt-6">
              <ConsultasList pacienteId={pacienteId} />
            </TabsContent>

            <TabsContent value="procedimientos" className="mt-6">
              <ProcedimientosList pacienteId={pacienteId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AddConsultaDialog open={showAddDialog} onOpenChange={setShowAddDialog} pacienteId={pacienteId} />
    </div>
  )
}
