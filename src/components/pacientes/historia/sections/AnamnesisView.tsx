// src/components/pacientes/historia/sections/AnamnesisView.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Stethoscope,
  AlertTriangle,
  Pill,
  Activity,
  Heart,
  Baby,
  FileText,
  Calendar,
  Phone,
  AlertCircle as AlertCircleIcon,
} from "lucide-react"
import { formatDate } from "@/lib/utils/patient-helpers"

// Tipo para la estructura de anamnesis
export interface AnamnesisData {
  hospitalizadoUltimos2Anos: boolean | null
  hospitalizadoPorQue: string
  hospitalizadoDonde: string
  atencionMedicaUltimos2Anos: boolean | null
  atencionMedicaPorQue: string
  atencionMedicaDonde: string
  alergicoDrogas: boolean | null
  alergicoDrogasCuales: string
  hemorragiaTratada: boolean | null
  enfermedadesSistemicas: string[]
  otrasEnfermedades: boolean | null
  otrasEnfermedadesCual: string
  medicacionActual: boolean | null
  medicacionActualCual: string
  embarazada: boolean | null
  embarazadaSemanas: string
  amamantando: boolean | null
  presionArterialSistolica: string
  presionArterialDiastolica: string
  telefonoUrgencia: string
  motivoConsulta: string
  ultimaAtencionDental: string
  observacionesClinicas: string
  responsableLegal: string
  antecedentesPerinatales: string
  habitosOrales: string
  desarrolloDental: string
}

interface AnamnesisViewProps {
  anamnesisData: AnamnesisData
  fecha?: string
  createdBy?: string
  isPediatric?: boolean
}

// Mapeo de enfermedades sistémicas a labels legibles
const ENFERMEDADES_LABELS: Record<string, string> = {
  cardiopatia: "Cardiopatía",
  fiebre_reumatica: "Fiebre reumática",
  artritis: "Artritis",
  tuberculosis: "Tuberculosis",
  anemia: "Anemia",
  epilepsia: "Epilepsia",
  lesiones_cardiacas: "Lesiones cardíacas",
  tratamiento_psiquico: "Tratamiento psíquico",
  marcapasos: "Marcapasos",
  hepatitis: "Hepatitis",
  tratamiento_oncologico: "Tratamiento oncológico",
  hipertension: "Hipertensión arterial",
  diabetes: "Diabetes",
  apoplejia: "Apoplejía",
  accidentes_vasculares: "Accidentes vasculares",
  perdida_peso: "Pérdida de peso",
}

/**
 * Componente para mostrar anamnesis completa estructurada
 */
export function AnamnesisView({
  anamnesisData,
  fecha,
  createdBy,
  isPediatric = false,
}: AnamnesisViewProps) {
  // Helper para convertir boolean/null a texto
  const formatBoolean = (value: boolean | null | undefined): string => {
    if (value === null || value === undefined) return "No registrado"
    return value ? "Sí" : "No"
  }

  // Helper para mostrar valor o estado vacío
  const formatValue = (value: string | null | undefined, emptyText = "Sin datos"): string => {
    if (value === null || value === undefined) return emptyText
    if (typeof value === "string" && value.trim() === "") return emptyText
    return String(value)
  }

  // Helper para verificar si un campo tiene valor
  const hasValue = (value: string | null | undefined): boolean => {
    return value !== null && value !== undefined && String(value).trim() !== ""
  }

  // Helper para determinar si hay información crítica
  const hasCriticalInfo = () => {
    return (
      anamnesisData.alergicoDrogas === true ||
      anamnesisData.hemorragiaTratada === true ||
      anamnesisData.enfermedadesSistemicas.length > 0 ||
      anamnesisData.medicacionActual === true ||
      anamnesisData.embarazada === true
    )
  }

  return (
    <Card className={hasCriticalInfo() ? "border-orange-200 dark:border-orange-800" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Anamnesis Odontológica Completa
            </CardTitle>
            {fecha && (
              <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Registrada: {formatDate(fecha)}
                {createdBy && ` • Por: ${createdBy}`}
              </p>
            )}
          </div>
          {hasCriticalInfo() && (
            <Badge variant="outline" className="border-orange-500 text-orange-700 dark:text-orange-400">
              <AlertCircleIcon className="mr-1 h-3 w-3" />
              Información crítica
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={["antecedentes", "estado-actual"]} className="w-full">
          {/* Sección 1: Antecedentes Médicos Generales */}
          <AccordionItem value="antecedentes">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-blue-500" />
                <span className="font-semibold">1. Antecedentes Médicos Generales</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                {/* Hospitalizaciones */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Hospitalizado en los últimos 2 años:</span>
                    <Badge variant={anamnesisData.hospitalizadoUltimos2Anos ? "destructive" : "secondary"}>
                      {formatBoolean(anamnesisData.hospitalizadoUltimos2Anos)}
                    </Badge>
                  </div>
                  {anamnesisData.hospitalizadoUltimos2Anos === true && (
                    <div className="ml-6 space-y-2 rounded-lg border-l-2 border-blue-500 bg-blue-50 p-3 dark:bg-blue-950">
                      <AnamnesisItem
                        label="¿Por qué?"
                        value={formatValue(anamnesisData.hospitalizadoPorQue)}
                      />
                      <AnamnesisItem
                        label="¿Dónde?"
                        value={formatValue(anamnesisData.hospitalizadoDonde)}
                      />
                    </div>
                  )}
                </div>

                <Separator />

                {/* Atención médica */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Atención médica en los últimos 2 años:</span>
                    <Badge
                      variant={anamnesisData.atencionMedicaUltimos2Anos ? "default" : "secondary"}
                    >
                      {formatBoolean(anamnesisData.atencionMedicaUltimos2Anos)}
                    </Badge>
                  </div>
                  {anamnesisData.atencionMedicaUltimos2Anos === true && (
                    <div className="ml-6 space-y-2 rounded-lg border-l-2 border-blue-500 bg-blue-50 p-3 dark:bg-blue-950">
                      <AnamnesisItem
                        label="¿Por qué?"
                        value={formatValue(anamnesisData.atencionMedicaPorQue)}
                      />
                      <AnamnesisItem
                        label="¿Dónde?"
                        value={formatValue(anamnesisData.atencionMedicaDonde)}
                      />
                    </div>
                  )}
                </div>

                <Separator />

                {/* Alergias a drogas/anestesia/antibioticós */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium">
                      Alérgico a drogas, anestesia y/o antibióticos:
                    </span>
                    <Badge variant={anamnesisData.alergicoDrogas ? "destructive" : "secondary"}>
                      {formatBoolean(anamnesisData.alergicoDrogas)}
                    </Badge>
                  </div>
                  {anamnesisData.alergicoDrogas === true && (
                    <div className="ml-6 rounded-lg border-l-2 border-orange-500 bg-orange-50 p-3 dark:bg-orange-950">
                      <AnamnesisItem
                        label="¿Cuáles?"
                        value={formatValue(anamnesisData.alergicoDrogasCuales)}
                        isCritical
                      />
                    </div>
                  )}
                </div>

                <Separator />

                {/* Hemorragias */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Hemorragia tratada:</span>
                    <Badge variant={anamnesisData.hemorragiaTratada ? "destructive" : "secondary"}>
                      {formatBoolean(anamnesisData.hemorragiaTratada)}
                    </Badge>
                  </div>
                </div>

                <Separator />

                {/* Enfermedades sistémicas */}
                {anamnesisData.enfermedadesSistemicas.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Enfermedades sistémicas:</span>
                    <div className="flex flex-wrap gap-2">
                      {anamnesisData.enfermedadesSistemicas.map((enfermedad) => (
                        <Badge
                          key={enfermedad}
                          variant="destructive"
                          className="text-xs"
                        >
                          {ENFERMEDADES_LABELS[enfermedad] || enfermedad}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Otras enfermedades */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Otras enfermedades:</span>
                    <Badge variant={anamnesisData.otrasEnfermedades ? "default" : "secondary"}>
                      {formatBoolean(anamnesisData.otrasEnfermedades)}
                    </Badge>
                  </div>
                  {anamnesisData.otrasEnfermedades === true && (
                    <div className="ml-6 rounded-lg border-l-2 border-blue-500 bg-blue-50 p-3 dark:bg-blue-950">
                      <AnamnesisItem
                        label="¿Cuál?"
                        value={formatValue(anamnesisData.otrasEnfermedadesCual)}
                      />
                    </div>
                  )}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Sección 2: Alergias y Medicación */}
          <AccordionItem value="alergias-medicacion">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4 text-purple-500" />
                <span className="font-semibold">2. Alergias y Medicación Actual</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                {/* Medicación actual */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Pill className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Medicación actual:</span>
                    <Badge variant={anamnesisData.medicacionActual ? "default" : "secondary"}>
                      {formatBoolean(anamnesisData.medicacionActual)}
                    </Badge>
                  </div>
                  {anamnesisData.medicacionActual === true && (
                    <div className="ml-6 rounded-lg border-l-2 border-blue-500 bg-blue-50 p-3 dark:bg-blue-950">
                      <AnamnesisItem
                        label="¿Cuál?"
                        value={formatValue(anamnesisData.medicacionActualCual)}
                        isCritical
                      />
                    </div>
                  )}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Sección 3: Estado Actual */}
          <AccordionItem value="estado-actual">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-500" />
                <span className="font-semibold">3. Estado Actual</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                {/* Presión arterial */}
                {(hasValue(anamnesisData.presionArterialSistolica) ||
                  hasValue(anamnesisData.presionArterialDiastolica)) && (
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium">Presión arterial:</span>
                    <Badge variant="outline">
                      {anamnesisData.presionArterialSistolica || "—"} /{" "}
                      {anamnesisData.presionArterialDiastolica || "—"} mmHg
                    </Badge>
                  </div>
                )}

                <Separator />

                {/* Embarazo */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Baby className="h-4 w-4 text-pink-500" />
                    <span className="text-sm font-medium">Embarazada:</span>
                    <Badge variant={anamnesisData.embarazada ? "default" : "secondary"}>
                      {formatBoolean(anamnesisData.embarazada)}
                    </Badge>
                  </div>
                  {anamnesisData.embarazada === true && (
                    <div className="ml-6 rounded-lg border-l-2 border-pink-500 bg-pink-50 p-3 dark:bg-pink-950">
                      <AnamnesisItem
                        label="Semanas de gestación"
                        value={formatValue(anamnesisData.embarazadaSemanas)}
                        isCritical
                      />
                    </div>
                  )}
                </div>

                <Separator />

                {/* Lactancia */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Baby className="h-4 w-4 text-pink-500" />
                    <span className="text-sm font-medium">Amamantando:</span>
                    <Badge variant={anamnesisData.amamantando ? "default" : "secondary"}>
                      {formatBoolean(anamnesisData.amamantando)}
                    </Badge>
                  </div>
                </div>

                <Separator />

                {/* Teléfono de urgencia */}
                {hasValue(anamnesisData.telefonoUrgencia) && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Teléfono de urgencia:</span>
                    <span className="text-sm">{anamnesisData.telefonoUrgencia}</span>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Sección 4: Motivo de Consulta y Antecedentes Odontológicos */}
          <AccordionItem value="motivo-odontologicos">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-500" />
                <span className="font-semibold">4. Motivo de Consulta y Antecedentes Odontológicos</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                {/* Motivo de consulta */}
                {hasValue(anamnesisData.motivoConsulta) && (
                  <div className="space-y-1">
                    <span className="text-sm font-medium">Motivo de consulta:</span>
                    <p className="rounded-lg border bg-muted/50 p-3 text-sm">
                      {anamnesisData.motivoConsulta}
                    </p>
                  </div>
                )}

                <Separator />

                {/* Última atención dental */}
                {hasValue(anamnesisData.ultimaAtencionDental) && (
                  <AnamnesisItem
                    label="Última atención dental"
                    value={(() => {
                      try {
                        // Intentar parsear como fecha ISO
                        const date = new Date(anamnesisData.ultimaAtencionDental)
                        if (!isNaN(date.getTime())) {
                          return formatDate(anamnesisData.ultimaAtencionDental)
                        }
                        // Si no es fecha válida, mostrar como texto
                        return anamnesisData.ultimaAtencionDental
                      } catch {
                        return anamnesisData.ultimaAtencionDental
                      }
                    })()}
                  />
                )}

                <Separator />

                {/* Observaciones clínicas */}
                {hasValue(anamnesisData.observacionesClinicas) && (
                  <div className="space-y-1">
                    <span className="text-sm font-medium">Observaciones clínicas:</span>
                    <p className="rounded-lg border bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                      {anamnesisData.observacionesClinicas}
                    </p>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Sección 5: Información Pediátrica (solo si aplica) */}
          {isPediatric && (
            <AccordionItem value="pediatrica">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Baby className="h-4 w-4 text-pink-500" />
                  <span className="font-semibold">5. Información Pediátrica</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  {hasValue(anamnesisData.responsableLegal) && (
                    <AnamnesisItem
                      label="Responsable legal"
                      value={anamnesisData.responsableLegal}
                    />
                  )}

                  {hasValue(anamnesisData.antecedentesPerinatales) && (
                    <div className="space-y-1">
                      <span className="text-sm font-medium">Antecedentes perinatales:</span>
                      <p className="rounded-lg border bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                        {anamnesisData.antecedentesPerinatales}
                      </p>
                    </div>
                  )}

                  {hasValue(anamnesisData.habitosOrales) && (
                    <div className="space-y-1">
                      <span className="text-sm font-medium">Hábitos orales:</span>
                      <p className="rounded-lg border bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                        {anamnesisData.habitosOrales}
                      </p>
                    </div>
                  )}

                  {hasValue(anamnesisData.desarrolloDental) && (
                    <div className="space-y-1">
                      <span className="text-sm font-medium">Desarrollo dental:</span>
                      <p className="rounded-lg border bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                        {anamnesisData.desarrolloDental}
                      </p>
                    </div>
                  )}

                  {!hasValue(anamnesisData.responsableLegal) &&
                    !hasValue(anamnesisData.antecedentesPerinatales) &&
                    !hasValue(anamnesisData.habitosOrales) &&
                    !hasValue(anamnesisData.desarrolloDental) && (
                      <p className="text-sm text-muted-foreground italic">
                        No hay información pediátrica registrada
                      </p>
                    )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </CardContent>
    </Card>
  )
}

/**
 * Componente helper para mostrar items de anamnesis
 */
interface AnamnesisItemProps {
  label: string
  value: string
  isCritical?: boolean
}

function AnamnesisItem({ label, value, isCritical = false }: AnamnesisItemProps) {
  if (value === "Sin datos" || value === "No registrado") {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium text-muted-foreground">{label}:</span>
        <span className="text-muted-foreground italic">{value}</span>
      </div>
    )
  }

  return (
    <div className={`flex items-start gap-2 text-sm ${isCritical ? "font-medium" : ""}`}>
      <span className={`font-medium ${isCritical ? "text-orange-700 dark:text-orange-400" : ""}`}>
        {label}:
      </span>
      <span className={isCritical ? "text-orange-700 dark:text-orange-400" : ""}>{value}</span>
    </div>
  )
}

