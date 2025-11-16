// src/components/consulta-clinica/modules/AnamnesisCompletaModule.tsx
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog"
import { 
  FileText, 
  Save, 
  Edit, 
  AlertCircle, 
  Info,
  User,
  Calendar,
  Phone,
  MapPin,
  Baby,
  Stethoscope
} from "lucide-react"
import { toast } from "sonner"
import type { ConsultaClinicaDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"

interface AnamnesisCompletaModuleProps {
  citaId: number
  consulta: ConsultaClinicaDTO
  canEdit: boolean
  hasConsulta: boolean
  onUpdate: () => void
}

// Enfermedades sistémicas comunes
const ENFERMEDADES_SISTEMICAS = [
  { id: "cardiopatia", label: "Cardiopatía" },
  { id: "fiebre_reumatica", label: "Fiebre reumática" },
  { id: "artritis", label: "Artritis" },
  { id: "tuberculosis", label: "Tuberculosis" },
  { id: "anemia", label: "Anemia" },
  { id: "epilepsia", label: "Epilepsia" },
  { id: "lesiones_cardiacas", label: "Lesiones cardíacas" },
  { id: "tratamiento_psiquico", label: "Tratamiento psíquico" },
  { id: "marcapasos", label: "Marcapasos" },
  { id: "hepatitis", label: "Hepatitis" },
  { id: "tratamiento_oncologico", label: "Tratamiento oncológico" },
  { id: "hipertension", label: "Hipertensión arterial" },
  { id: "diabetes", label: "Diabetes" },
  { id: "apoplejia", label: "Apoplejía" },
  { id: "accidentes_vasculares", label: "Accidentes vasculares" },
  { id: "perdida_peso", label: "Pérdida de peso" },
] as const

interface AnamnesisFormData {
  // Historial médico general
  hospitalizadoUltimos2Anos: boolean | null
  hospitalizadoPorQue: string
  hospitalizadoDonde: string
  atencionMedicaUltimos2Anos: boolean | null
  atencionMedicaPorQue: string
  atencionMedicaDonde: string
  alergicoDrogas: boolean | null
  alergicoDrogasCuales: string
  hemorragiaTratada: boolean | null
  enfermedadesSistemicas: string[] // IDs de enfermedades marcadas
  otrasEnfermedades: boolean | null
  otrasEnfermedadesCual: string
  medicacionActual: boolean | null
  medicacionActualCual: string
  embarazada: boolean | null
  embarazadaSemanas: string
  amamantando: boolean | null
  
  // Estado actual
  presionArterialSistolica: string
  presionArterialDiastolica: string
  telefonoUrgencia: string
  
  // Motivo y observaciones
  motivoConsulta: string
  ultimaAtencionDental: string // Fecha
  observacionesClinicas: string
  
  // Campos específicos para niños
  responsableLegal: string
  antecedentesPerinatales: string
  habitosOrales: string
  desarrolloDental: string
}

const INITIAL_FORM_DATA: AnamnesisFormData = {
  hospitalizadoUltimos2Anos: null,
  hospitalizadoPorQue: "",
  hospitalizadoDonde: "",
  atencionMedicaUltimos2Anos: null,
  atencionMedicaPorQue: "",
  atencionMedicaDonde: "",
  alergicoDrogas: null,
  alergicoDrogasCuales: "",
  hemorragiaTratada: null,
  enfermedadesSistemicas: [],
  otrasEnfermedades: null,
  otrasEnfermedadesCual: "",
  medicacionActual: null,
  medicacionActualCual: "",
  embarazada: null,
  embarazadaSemanas: "",
  amamantando: null,
  presionArterialSistolica: "",
  presionArterialDiastolica: "",
  telefonoUrgencia: "",
  motivoConsulta: "",
  ultimaAtencionDental: "",
  observacionesClinicas: "",
  responsableLegal: "",
  antecedentesPerinatales: "",
  habitosOrales: "",
  desarrolloDental: "",
}

/**
 * Módulo de Anamnesis Completa Odontológica
 * 
 * Incluye:
 * - Historial médico general
 * - Alergias y medicaciones (integradas)
 * - Estado actual (presión arterial, embarazo, etc.)
 * - Motivo de consulta y observaciones
 * - Campos específicos para niños (si aplica)
 */
export function AnamnesisCompletaModule({ 
  citaId, 
  consulta, 
  canEdit, 
  hasConsulta, 
  onUpdate 
}: AnamnesisCompletaModuleProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<AnamnesisFormData>(INITIAL_FORM_DATA)
  const [hasAnamnesis, setHasAnamnesis] = useState(false)

  // Determinar si es paciente pediátrico (menor de 18 años)
  const esPacientePediatrico = useMemo(() => {
    if (!consulta.paciente?.edad) return false
    return consulta.paciente.edad < 18
  }, [consulta.paciente?.edad])

  // Cargar anamnesis existente
  useEffect(() => {
    if (consulta.anamnesis && consulta.anamnesis.length > 0) {
      // Buscar la anamnesis más reciente que tenga título "Anamnesis Completa"
      const anamnesisCompleta = consulta.anamnesis.find(
        (a) => a.title === "Anamnesis Completa" || a.title?.includes("Anamnesis")
      )
      
      if (anamnesisCompleta) {
        try {
          // Parsear el JSON almacenado en notes
          const parsed = JSON.parse(anamnesisCompleta.notes)
          setFormData(parsed)
          setHasAnamnesis(true)
        } catch (e) {
          console.error("Error parsing anamnesis:", e)
          // Si no se puede parsear, intentar extraer datos del texto
          setHasAnamnesis(true)
        }
      }
    }
  }, [consulta.anamnesis])

  const handleSave = async () => {
    try {
      setIsSaving(true)

      // Validaciones básicas
      if (!formData.motivoConsulta.trim()) {
        toast.error("El motivo de consulta es obligatorio")
        return
      }

      // Preparar datos para guardar
      const anamnesisData = {
        title: "Anamnesis Completa",
        notes: JSON.stringify(formData),
      }

      const url = hasAnamnesis
        ? `/api/agenda/citas/${citaId}/consulta/anamnesis/${consulta.anamnesis.find(a => a.title === "Anamnesis Completa")?.id}`
        : `/api/agenda/citas/${citaId}/consulta/anamnesis`
      const method = hasAnamnesis ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(anamnesisData),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al guardar anamnesis")
      }

      toast.success("Anamnesis guardada correctamente")
      setIsDialogOpen(false)
      onUpdate()
      setHasAnamnesis(true)
    } catch (error) {
      console.error("Error saving anamnesis:", error)
      toast.error(error instanceof Error ? error.message : "Error al guardar anamnesis")
    } finally {
      setIsSaving(false)
    }
  }

  const toggleEnfermedad = (enfermedadId: string) => {
    setFormData((prev) => ({
      ...prev,
      enfermedadesSistemicas: prev.enfermedadesSistemicas.includes(enfermedadId)
        ? prev.enfermedadesSistemicas.filter((id) => id !== enfermedadId)
        : [...prev.enfermedadesSistemicas, enfermedadId],
    }))
  }

  const renderPreguntaSiNo = (
    label: string,
    value: boolean | null,
    onChange: (value: boolean | null) => void,
    showDetails?: {
      show: boolean
      label: string
      value: string
      onChange: (value: string) => void
      placeholder?: string
    }[]
  ) => {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <RadioGroup
          value={value === null ? "null" : value ? "si" : "no"}
          onValueChange={(val) => {
            if (val === "null") onChange(null)
            else onChange(val === "si")
          }}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="si" id={`${label}-si`} />
            <Label htmlFor={`${label}-si`} className="cursor-pointer">Sí</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id={`${label}-no`} />
            <Label htmlFor={`${label}-no`} className="cursor-pointer">No</Label>
          </div>
        </RadioGroup>
        {value === true && showDetails && showDetails.length > 0 && (
          <div className="ml-6 space-y-2">
            {showDetails.map((detail, idx) => (
              <div key={idx} className="space-y-1">
                <Label className="text-sm">{detail.label}</Label>
                <Input
                  value={detail.value}
                  onChange={(e) => detail.onChange(e.target.value)}
                  placeholder={detail.placeholder}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Información del paciente (solo lectura) */}
      {consulta.paciente && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información del Paciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Nombre completo</Label>
                <p className="font-medium">
                  {consulta.paciente.nombres} {consulta.paciente.apellidos}
                </p>
              </div>
              {consulta.paciente.fechaNacimiento && (
                <div>
                  <Label className="text-sm text-muted-foreground">Fecha de nacimiento / Edad</Label>
                  <p className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(consulta.paciente.fechaNacimiento).toLocaleDateString("es-PY")}
                    {consulta.paciente.edad !== null && (
                      <Badge variant="outline">{consulta.paciente.edad} años</Badge>
                    )}
                  </p>
                </div>
              )}
              {consulta.paciente.direccion && (
                <div>
                  <Label className="text-sm text-muted-foreground">Dirección</Label>
                  <p className="font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {consulta.paciente.direccion}
                  </p>
                </div>
              )}
              {consulta.paciente.telefono && (
                <div>
                  <Label className="text-sm text-muted-foreground">Teléfono</Label>
                  <p className="font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {consulta.paciente.telefono}
                  </p>
                </div>
              )}
            </div>
            {esPacientePediatrico && (
              <Alert className="mt-4">
                <Baby className="h-4 w-4" />
                <AlertDescription>
                  Paciente pediátrico. Se mostrarán campos adicionales en la anamnesis.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Estado de anamnesis */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                Anamnesis Odontológica Completa
              </CardTitle>
              <CardDescription className="mt-1">
                {hasAnamnesis
                  ? "Anamnesis registrada. Puede editar la información."
                  : "Complete la anamnesis del paciente. Esta información es obligatoria para pacientes nuevos."}
              </CardDescription>
            </div>
            {canEdit && (
              <Button onClick={() => setIsDialogOpen(true)} size="sm">
                {hasAnamnesis ? (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar Anamnesis
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Completar Anamnesis
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        {!hasAnamnesis && (
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                La anamnesis no ha sido completada. Por favor, complete todos los campos requeridos.
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* Dialog de anamnesis completa */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Anamnesis Odontológica Completa</DialogTitle>
            <DialogDescription>
              Complete todos los campos de la anamnesis del paciente. Los campos marcados con * son obligatorios.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Sección 1: Historial Médico General */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                1. Historial Médico General
              </h3>
              
              {renderPreguntaSiNo(
                "¿Ha estado hospitalizado en estos dos últimos años?",
                formData.hospitalizadoUltimos2Anos,
                (val) => setFormData((prev) => ({ ...prev, hospitalizadoUltimos2Anos: val })),
                [
                  {
                    show: formData.hospitalizadoUltimos2Anos === true,
                    label: "¿Por qué?",
                    value: formData.hospitalizadoPorQue,
                    onChange: (val) => setFormData((prev) => ({ ...prev, hospitalizadoPorQue: val })),
                    placeholder: "Especifique el motivo",
                  },
                  {
                    show: formData.hospitalizadoUltimos2Anos === true,
                    label: "¿Dónde?",
                    value: formData.hospitalizadoDonde,
                    onChange: (val) => setFormData((prev) => ({ ...prev, hospitalizadoDonde: val })),
                    placeholder: "Nombre del centro médico",
                  },
                ]
              )}

              <Separator />

              {renderPreguntaSiNo(
                "¿Ha estado bajo atención médica en estos dos últimos años?",
                formData.atencionMedicaUltimos2Anos,
                (val) => setFormData((prev) => ({ ...prev, atencionMedicaUltimos2Anos: val })),
                [
                  {
                    show: formData.atencionMedicaUltimos2Anos === true,
                    label: "¿Por qué?",
                    value: formData.atencionMedicaPorQue,
                    onChange: (val) => setFormData((prev) => ({ ...prev, atencionMedicaPorQue: val })),
                    placeholder: "Especifique el motivo",
                  },
                  {
                    show: formData.atencionMedicaUltimos2Anos === true,
                    label: "¿Dónde?",
                    value: formData.atencionMedicaDonde,
                    onChange: (val) => setFormData((prev) => ({ ...prev, atencionMedicaDonde: val })),
                    placeholder: "Nombre del centro médico",
                  },
                ]
              )}

              <Separator />

              {renderPreguntaSiNo(
                "¿Es alérgico a alguna droga, anestesia y/o antibióticos?",
                formData.alergicoDrogas,
                (val) => setFormData((prev) => ({ ...prev, alergicoDrogas: val })),
                [
                  {
                    show: formData.alergicoDrogas === true,
                    label: "¿Cuáles?",
                    value: formData.alergicoDrogasCuales,
                    onChange: (val) => setFormData((prev) => ({ ...prev, alergicoDrogasCuales: val })),
                    placeholder: "Especifique las alergias",
                  },
                ]
              )}

              <Separator />

              {renderPreguntaSiNo(
                "¿Ha tenido hemorragia que haya tenido que ser tratada?",
                formData.hemorragiaTratada,
                (val) => setFormData((prev) => ({ ...prev, hemorragiaTratada: val }))
              )}

              <Separator />

              {/* Enfermedades sistémicas */}
              <div className="space-y-2">
                <Label>Si ha tenido algunas de estas enfermedades, márquela:</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {ENFERMEDADES_SISTEMICAS.map((enfermedad) => (
                    <div key={enfermedad.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={enfermedad.id}
                        checked={formData.enfermedadesSistemicas.includes(enfermedad.id)}
                        onCheckedChange={() => toggleEnfermedad(enfermedad.id)}
                      />
                      <Label htmlFor={enfermedad.id} className="text-sm cursor-pointer">
                        {enfermedad.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {renderPreguntaSiNo(
                "¿Ha tenido alguna otra enfermedad?",
                formData.otrasEnfermedades,
                (val) => setFormData((prev) => ({ ...prev, otrasEnfermedades: val })),
                [
                  {
                    show: formData.otrasEnfermedades === true,
                    label: "¿Cuál?",
                    value: formData.otrasEnfermedadesCual,
                    onChange: (val) => setFormData((prev) => ({ ...prev, otrasEnfermedadesCual: val })),
                    placeholder: "Especifique la enfermedad",
                  },
                ]
              )}

              <Separator />

              {renderPreguntaSiNo(
                "¿Está tomando alguna medicación actualmente?",
                formData.medicacionActual,
                (val) => setFormData((prev) => ({ ...prev, medicacionActual: val })),
                [
                  {
                    show: formData.medicacionActual === true,
                    label: "¿Cuál?",
                    value: formData.medicacionActualCual,
                    onChange: (val) => setFormData((prev) => ({ ...prev, medicacionActualCual: val })),
                    placeholder: "Especifique la medicación",
                  },
                ]
              )}

              <Separator />

              {renderPreguntaSiNo(
                "¿Está embarazada?",
                formData.embarazada,
                (val) => setFormData((prev) => ({ ...prev, embarazada: val })),
                [
                  {
                    show: formData.embarazada === true,
                    label: "¿Cuántas semanas?",
                    value: formData.embarazadaSemanas,
                    onChange: (val) => setFormData((prev) => ({ ...prev, embarazadaSemanas: val })),
                    placeholder: "Ej: 12 semanas",
                  },
                ]
              )}

              <Separator />

              {renderPreguntaSiNo(
                "¿Está amamantando?",
                formData.amamantando,
                (val) => setFormData((prev) => ({ ...prev, amamantando: val }))
              )}
            </div>

            <Separator className="my-6" />

            {/* Sección 2: Estado Actual */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">2. Estado Actual</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Presión arterial sistólica (mm Hg)</Label>
                  <Input
                    type="number"
                    value={formData.presionArterialSistolica}
                    onChange={(e) => setFormData((prev) => ({ ...prev, presionArterialSistolica: e.target.value }))}
                    placeholder="Ej: 120"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Presión arterial diastólica (mm Hg)</Label>
                  <Input
                    type="number"
                    value={formData.presionArterialDiastolica}
                    onChange={(e) => setFormData((prev) => ({ ...prev, presionArterialDiastolica: e.target.value }))}
                    placeholder="Ej: 80"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>En caso de urgencia llamar al teléfono:</Label>
                <Input
                  value={formData.telefonoUrgencia}
                  onChange={(e) => setFormData((prev) => ({ ...prev, telefonoUrgencia: e.target.value }))}
                  placeholder="Ej: +595 981 123456"
                />
              </div>
            </div>

            <Separator className="my-6" />

            {/* Sección 3: Motivo y Observaciones */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">3. Motivo de Consulta y Observaciones</h3>
              
              <div className="space-y-2">
                <Label>
                  Motivo de consulta <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  value={formData.motivoConsulta}
                  onChange={(e) => setFormData((prev) => ({ ...prev, motivoConsulta: e.target.value }))}
                  placeholder="Describa el motivo principal de la consulta..."
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Fecha de última atención dental</Label>
                <Input
                  type="date"
                  value={formData.ultimaAtencionDental}
                  onChange={(e) => setFormData((prev) => ({ ...prev, ultimaAtencionDental: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Observaciones clínicas</Label>
                <Textarea
                  value={formData.observacionesClinicas}
                  onChange={(e) => setFormData((prev) => ({ ...prev, observacionesClinicas: e.target.value }))}
                  placeholder="Observaciones adicionales relevantes..."
                  rows={4}
                />
              </div>
            </div>

            {/* Sección 4: Campos específicos para niños */}
            {esPacientePediatrico && (
              <>
                <Separator className="my-6" />
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Baby className="h-5 w-5" />
                    4. Información Pediátrica
                  </h3>
                  
                  <div className="space-y-2">
                    <Label>Responsable legal</Label>
                    <Input
                      value={formData.responsableLegal}
                      onChange={(e) => setFormData((prev) => ({ ...prev, responsableLegal: e.target.value }))}
                      placeholder="Nombre del responsable legal"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Antecedentes perinatales</Label>
                    <Textarea
                      value={formData.antecedentesPerinatales}
                      onChange={(e) => setFormData((prev) => ({ ...prev, antecedentesPerinatales: e.target.value }))}
                      placeholder="Complicaciones durante el embarazo, parto, etc."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Hábitos orales</Label>
                    <Textarea
                      value={formData.habitosOrales}
                      onChange={(e) => setFormData((prev) => ({ ...prev, habitosOrales: e.target.value }))}
                      placeholder="Chupete, succión digital, respiración bucal, etc."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Desarrollo dental</Label>
                    <Textarea
                      value={formData.desarrolloDental}
                      onChange={(e) => setFormData((prev) => ({ ...prev, desarrolloDental: e.target.value }))}
                      placeholder="Erupción dental, problemas de desarrollo, etc."
                      rows={3}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !formData.motivoConsulta.trim()}>
              {isSaving ? (
                "Guardando..."
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Anamnesis
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

