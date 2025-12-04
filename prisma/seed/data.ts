export const ESPECIALIDADES = [
  "Odontología General",
  "Endodoncia",
  "Ortodoncia",
  "Implantología",
  "Periodoncia",
  "Odontopediatría",
];

export const CONSULTORIOS: Array<{ nombre: string; colorHex: string }> = [
  { nombre: "Box 1", colorHex: "#2DD4BF" },
];

export const MOTIVOS = [
  "Dolor molar",
  "Control post tratamiento",
  "Limpieza semestral",
  "Evaluación ortodoncia",
  "Urgencia: fractura",
  "Endodoncia pieza 26",
];

/**
 * Catálogo de procedimientos clínicos - 20 procedimientos más comunes
 * 
 * NOTA IMPORTANTE: El campo defaultPriceCents almacena guaraníes (PYG), no centavos.
 * Los valores aquí representan precios en guaraníes enteros (sin decimales).
 * 
 * Precios ajustados a valores realistas para clínicas dentales en Paraguay (2024-2025)
 * Basados en rangos típicos del mercado paraguayo
 */
export const PROCEDIMIENTOS_CATALOGO = [
  // 1-3: Consultas y controles (más frecuentes)
  { code: "CONS-INI", nombre: "Consulta inicial", descripcion: "Evaluación y diagnóstico completo", defaultDurationMin: 30, defaultPriceCents: 180000, aplicaDiente: false, aplicaSuperficie: false, esCirugia: false }, // ₲180.000
  { code: "CTRL",     nombre: "Control",          descripcion: "Consulta de seguimiento",            defaultDurationMin: 20, defaultPriceCents: 120000, aplicaDiente: false, aplicaSuperficie: false, esCirugia: false }, // ₲120.000
  { code: "URG",      nombre: "Urgencia",         descripcion: "Consulta de urgencia",  defaultDurationMin: 30, defaultPriceCents: 220000, aplicaDiente: false, aplicaSuperficie: false, esCirugia: false }, // ₲220.000
  
  // 4-5: Profilaxis y limpieza (muy comunes)
  { code: "LIMP",     nombre: "Limpieza dental",         descripcion: "Profilaxis y limpieza profesional",             defaultDurationMin: 40, defaultPriceCents: 200000, aplicaDiente: false, aplicaSuperficie: false, esCirugia: false }, // ₲200.000
  { code: "LIMP-PROF", nombre: "Limpieza profunda", descripcion: "Raspado y alisado radicular", defaultDurationMin: 60, defaultPriceCents: 450000, aplicaDiente: false, aplicaSuperficie: false, esCirugia: false }, // ₲450.000
  
  // 6-8: Restauraciones (muy comunes)
  { code: "OBT",      nombre: "Obturación",       descripcion: "Obturación con resina compuesta",       defaultDurationMin: 45, defaultPriceCents: 320000, aplicaDiente: true,  aplicaSuperficie: true,  esCirugia: false }, // ₲320.000
  { code: "OBT-AMAL", nombre: "Obturación amalgama", descripcion: "Obturación con amalgama", defaultDurationMin: 40, defaultPriceCents: 250000, aplicaDiente: true, aplicaSuperficie: true, esCirugia: false }, // ₲250.000
  { code: "INLAY",    nombre: "Inlay",            descripcion: "Inlay de resina o cerámica", defaultDurationMin: 60, defaultPriceCents: 750000, aplicaDiente: true, aplicaSuperficie: true, esCirugia: false }, // ₲750.000
  
  // 9-10: Endodoncia (común)
  { code: "ENDO",     nombre: "Endodoncia",       descripcion: "Tratamiento de conducto radicular",   defaultDurationMin: 90, defaultPriceCents: 950000, aplicaDiente: true,  aplicaSuperficie: false, esCirugia: false }, // ₲950.000
  { code: "ENDO-RET", nombre: "Reendodoncia",    descripcion: "Retratamiento endodóntico", defaultDurationMin: 120, defaultPriceCents: 1400000, aplicaDiente: true, aplicaSuperficie: false, esCirugia: false }, // ₲1.400.000
  
  // 11-12: Cirugía oral (común)
  { code: "EXT",      nombre: "Extracción",       descripcion: "Extracción dental simple",                 defaultDurationMin: 30, defaultPriceCents: 280000, aplicaDiente: true,  aplicaSuperficie: false, esCirugia: true }, // ₲280.000
  { code: "EXT-QUIR", nombre: "Extracción quirúrgica", descripcion: "Extracción quirúrgica compleja", defaultDurationMin: 60, defaultPriceCents: 550000, aplicaDiente: true, aplicaSuperficie: false, esCirugia: true }, // ₲550.000
  
  // 13-15: Prótesis fijas (común)
  { code: "CORONA",   nombre: "Corona",           descripcion: "Corona metal-porcelana", defaultDurationMin: 60, defaultPriceCents: 1300000, aplicaDiente: true, aplicaSuperficie: false, esCirugia: false }, // ₲1.300.000
  { code: "CORONA-ZIR", nombre: "Corona zirconio", descripcion: "Corona de zirconio", defaultDurationMin: 60, defaultPriceCents: 2200000, aplicaDiente: true, aplicaSuperficie: false, esCirugia: false }, // ₲2.200.000
  { code: "PUENTE",   nombre: "Puente fijo",      descripcion: "Puente fijo", defaultDurationMin: 90, defaultPriceCents: 2800000, aplicaDiente: true, aplicaSuperficie: false, esCirugia: false }, // ₲2.800.000
  
  // 16-17: Periodoncia (común)
  { code: "CURET",    nombre: "Curetaje",        descripcion: "Curetaje subgingival", defaultDurationMin: 60, defaultPriceCents: 400000, aplicaDiente: true, aplicaSuperficie: false, esCirugia: false }, // ₲400.000
  { code: "GINGIV",   nombre: "Gingivectomía",   descripcion: "Gingivectomía", defaultDurationMin: 45, defaultPriceCents: 380000, aplicaDiente: true, aplicaSuperficie: false, esCirugia: true }, // ₲380.000
  
  // 18-20: Radiografías y otros (muy comunes)
  { code: "RX-PERI",  nombre: "Radiografía periapical", descripcion: "Radiografía periapical", defaultDurationMin: 10, defaultPriceCents: 70000, aplicaDiente: true, aplicaSuperficie: false, esCirugia: false }, // ₲70.000
  { code: "RX-PANO",  nombre: "Radiografía panorámica", descripcion: "Radiografía panorámica", defaultDurationMin: 15, defaultPriceCents: 130000, aplicaDiente: false, aplicaSuperficie: false, esCirugia: false }, // ₲130.000
  { code: "RX-BITE",  nombre: "Radiografía bitewing", descripcion: "Radiografía bitewing", defaultDurationMin: 10, defaultPriceCents: 90000, aplicaDiente: false, aplicaSuperficie: false, esCirugia: false }, // ₲90.000
];

export const DIAGNOSIS_CATALOG = [
  // Caries (K02)
  { code: "K02.0", name: "Caries limitada al esmalte", description: "Caries inicial, lesión incipiente" },
  { code: "K02.1", name: "Caries dental", description: "Caries de la dentina" },
  { code: "K02.2", name: "Caries del cemento", description: "Caries radicular" },
  { code: "K02.3", name: "Caries detenida", description: "Caries inactiva" },
  { code: "K02.4", name: "Odontoclasia", description: "Caries de la infancia" },
  { code: "K02.5", name: "Caries con exposición pulpar", description: "Caries avanzada con pulpa expuesta" },
  
  // Enfermedades de la pulpa y tejidos periapicales (K04)
  { code: "K04.0", name: "Pulpite", description: "Inflamación de la pulpa dental" },
  { code: "K04.1", name: "Necrosis pulpar", description: "Muerte del tejido pulpar" },
  { code: "K04.2", name: "Degeneración pulpar", description: "Degeneración del tejido pulpar" },
  { code: "K04.3", name: "Formación anormal de tejido duro en la pulpa", description: "Calcificación pulpar" },
  { code: "K04.4", name: "Periodontitis apical aguda de origen pulpar", description: "Absceso periapical agudo" },
  { code: "K04.5", name: "Periodontitis apical crónica", description: "Periodontitis apical crónica" },
  { code: "K04.6", name: "Absceso periapical con fístula", description: "Absceso con drenaje" },
  { code: "K04.7", name: "Quiste periapical", description: "Quiste radicular" },
  
  // Enfermedades gingivales y periodontales (K05)
  { code: "K05.0", name: "Gingivitis aguda", description: "Inflamación aguda de encías" },
  { code: "K05.1", name: "Gingivitis crónica", description: "Inflamación crónica de encías" },
  { code: "K05.2", name: "Periodontitis aguda", description: "Enfermedad periodontal aguda" },
  { code: "K05.3", name: "Periodontitis crónica", description: "Enfermedad periodontal crónica" },
  { code: "K05.4", name: "Periodontosis", description: "Periodontosis" },
  { code: "K05.5", name: "Otras enfermedades periodontales", description: "Otras afecciones periodontales" },
  
  // Otras enfermedades de los dientes y estructuras de sostén (K08)
  { code: "K08.1", name: "Pérdida de dientes por accidente", description: "Pérdida traumática" },
  { code: "K08.2", name: "Atrofia de reborde alveolar", description: "Reabsorción ósea alveolar" },
  { code: "K08.3", name: "Retención de raíz dental", description: "Raíz retenida" },
  { code: "K08.8", name: "Otras alteraciones especificadas de los dientes y estructuras de sostén", description: "Otras alteraciones" },
  
  // Otras enfermedades de los maxilares (K10)
  { code: "K10.0", name: "Trastornos del desarrollo de los maxilares", description: "Anomalías del desarrollo" },
  { code: "K10.1", name: "Quiste odontógeno del desarrollo", description: "Quiste odontógeno" },
  { code: "K10.2", name: "Enfermedad inflamatoria de los maxilares", description: "Inflamación maxilar" },
  { code: "K10.3", name: "Alveolitis de los maxilares", description: "Alveolitis seca" },
  
  // Maloclusión (K07)
  { code: "K07.0", name: "Anomalías mayores del tamaño de los maxilares", description: "Anomalías de tamaño" },
  { code: "K07.1", name: "Anomalías de la relación maxilomandibular", description: "Maloclusión esquelética" },
  { code: "K07.2", name: "Anomalías de la posición de los dientes", description: "Malposición dental" },
  { code: "K07.3", name: "Maloclusión no especificada", description: "Maloclusión general" },
  
  // Trastornos del desarrollo y la erupción de los dientes (K00)
  { code: "K00.0", name: "Anodoncia", description: "Ausencia congénita de dientes" },
  { code: "K00.1", name: "Dientes supernumerarios", description: "Dientes extras" },
  { code: "K00.2", name: "Anomalías del tamaño y forma de los dientes", description: "Anomalías morfológicas" },
  { code: "K00.3", name: "Dientes moteados", description: "Fluorosis dental" },
  { code: "K00.4", name: "Alteraciones en la formación de los dientes", description: "Alteraciones del desarrollo" },
  { code: "K00.5", name: "Alteraciones hereditarias en la estructura dental", description: "Alteraciones genéticas" },
  { code: "K00.6", name: "Alteraciones en la erupción de los dientes", description: "Problemas de erupción" },
  
  // Enfermedades de los tejidos duros de los dientes (K03)
  { code: "K03.0", name: "Desgaste excesivo de los dientes", description: "Abrasión dental" },
  { code: "K03.1", name: "Abrasión de los dientes", description: "Abrasión" },
  { code: "K03.2", name: "Erosión de los dientes", description: "Erosión dental" },
  { code: "K03.3", name: "Reabsorción patológica de los dientes", description: "Reabsorción dental" },
  { code: "K03.4", name: "Hipercementosis", description: "Exceso de cemento" },
  { code: "K03.5", name: "Anquilosis de los dientes", description: "Anquilosis dental" },
  { code: "K03.6", name: "Depósitos en los dientes", description: "Cálculos y depósitos" },
  { code: "K03.7", name: "Cambios posteruptivos del color de los tejidos duros de los dientes", description: "Cambios de color" },
  
  // Otras enfermedades y afecciones de los dientes y estructuras de sostén (K09)
  { code: "K09.0", name: "Quistes de los maxilares relacionados con el desarrollo", description: "Quistes de desarrollo" },
  { code: "K09.1", name: "Quistes de los maxilares no relacionados con el desarrollo", description: "Quistes no odontógenos" },
  { code: "K09.2", name: "Otras lesiones de los maxilares", description: "Otras lesiones maxilares" },
  
  // Trastornos de la articulación temporomandibular (K07.6)
  { code: "K07.6", name: "Trastornos de la articulación temporomandibular", description: "ATM" },
  
  // Enfermedades de la mucosa oral (K12-K13)
  { code: "K12.0", name: "Estomatitis aftosa recurrente", description: "Aftas bucales recurrentes" },
  { code: "K12.1", name: "Otras formas de estomatitis", description: "Estomatitis variada" },
  { code: "K12.2", name: "Celulitis y absceso de boca", description: "Infección de tejidos blandos" },
  { code: "K13.0", name: "Enfermedades de los labios", description: "Queilitis y otras afecciones labiales" },
  { code: "K13.1", name: "Mordedura de mejilla y labio", description: "Trauma autoinfligido" },
  { code: "K13.2", name: "Leucoplasia y otras alteraciones del epitelio", description: "Lesiones precancerosas" },
  { code: "K13.3", name: "Hiperplasia de la mucosa oral", description: "Engrosamiento de mucosa" },
  { code: "K13.4", name: "Granuloma y lesiones similares de la mucosa oral", description: "Granulomas orales" },
  { code: "K13.5", name: "Fibrosis submucosa oral", description: "Fibrosis de tejidos" },
  { code: "K13.6", name: "Hiperplasia del reborde alveolar", description: "Hiperplasia alveolar" },
  { code: "K13.7", name: "Otras lesiones y alteraciones especificadas de la mucosa oral", description: "Otras lesiones mucosas" },
  
  // Trastornos del gusto (K14)
  { code: "K14.0", name: "Glositis", description: "Inflamación de la lengua" },
  { code: "K14.1", name: "Lengua geográfica", description: "Glositis migratoria benigna" },
  { code: "K14.2", name: "Lengua pilosa", description: "Hiperqueratosis lingual" },
  { code: "K14.3", name: "Hipertrofia de las papilas linguales", description: "Papilas linguales aumentadas" },
  { code: "K14.4", name: "Atrofia de las papilas linguales", description: "Pérdida de papilas" },
  { code: "K14.5", name: "Lengua plicada", description: "Lengua fisurada" },
  { code: "K14.6", name: "Glosodinia", description: "Dolor o ardor en la lengua" },
  { code: "K14.8", name: "Otras enfermedades especificadas de la lengua", description: "Otras afecciones linguales" },
  
  // Otras enfermedades de los labios y mucosa oral (K14.9)
  { code: "K14.9", name: "Enfermedad de la lengua no especificada", description: "Afección lingual no especificada" },
  
  // Trastornos de las glándulas salivales (K11)
  { code: "K11.0", name: "Atrofia de la glándula salival", description: "Reducción de glándulas salivales" },
  { code: "K11.1", name: "Hipertrofia de la glándula salival", description: "Aumento de glándulas salivales" },
  { code: "K11.2", name: "Sialoadenitis", description: "Inflamación de glándulas salivales" },
  { code: "K11.3", name: "Absceso de la glándula salival", description: "Infección de glándula salival" },
  { code: "K11.4", name: "Fístula de la glándula salival", description: "Fístula salival" },
  { code: "K11.5", name: "Sialolitiasis", description: "Cálculos en glándulas salivales" },
  { code: "K11.6", name: "Mucocele", description: "Quiste de retención mucoso" },
  { code: "K11.7", name: "Alteraciones en la secreción salival", description: "Xerostomía o hipersalivación" },
  { code: "K11.8", name: "Otras enfermedades de las glándulas salivales", description: "Otras afecciones salivales" },
  { code: "K11.9", name: "Enfermedad de la glándula salival no especificada", description: "Afección salival no especificada" },
  
  // Trastornos del desarrollo dental (K00 adicionales)
  { code: "K00.7", name: "Síndrome de erupción dental", description: "Problemas en la erupción" },
  { code: "K00.8", name: "Otras anomalías del desarrollo dental", description: "Otras anomalías" },
  { code: "K00.9", name: "Anomalía del desarrollo dental no especificada", description: "Anomalía no especificada" },
  
  // Enfermedades pulpares adicionales (K04)
  { code: "K04.8", name: "Otras enfermedades especificadas de la pulpa y tejidos periapicales", description: "Otras afecciones pulpares" },
  { code: "K04.9", name: "Enfermedad de la pulpa y tejidos periapicales no especificada", description: "Afección pulpar no especificada" },
  
  // Enfermedades periodontales adicionales (K05)
  { code: "K05.6", name: "Lesiones destructivas periodontales", description: "Destrucción periodontal" },
  { code: "K05.8", name: "Otras enfermedades periodontales especificadas", description: "Otras periodontopatías" },
  { code: "K05.9", name: "Enfermedad periodontal no especificada", description: "Periodontopatía no especificada" },
];

export const ALLERGY_CATALOG = [
  { name: "Lidocaína", description: "Alergia a anestésicos locales" },
  { name: "Penicilina", description: "Alergia a penicilina y derivados" },
  { name: "Latex", description: "Alergia al látex" },
  { name: "Ibuprofeno", description: "Alergia a antiinflamatorios no esteroideos" },
  { name: "Níquel", description: "Alergia a metales" },
  { name: "Acrílico", description: "Alergia a materiales acrílicos dentales" },
];

export const MEDICATION_CATALOG = [
  { name: "Ibuprofeno 400 mg", description: "Antiinflamatorio y analgésico" },
  { name: "Amoxicilina 500 mg", description: "Antibiótico de amplio espectro" },
  { name: "Paracetamol 500 mg", description: "Analgésico y antipirético" },
  { name: "Ácido Tranexámico", description: "Antihemorrágico" },
  { name: "Clorhexidina 0.12%", description: "Enjuague bucal antiséptico" },
  { name: "Metronidazol 500 mg", description: "Antibiótico para infecciones anaerobias" },
  { name: "Diclofenaco 50 mg", description: "Antiinflamatorio no esteroideo" },
];

export const ANTECEDENT_CATALOG = [
  { code: "HYPERTENSION", name: "Hipertensión arterial", category: "CARDIOVASCULAR" as const, description: "Presión arterial elevada" },
  { code: "DIABETES", name: "Diabetes mellitus", category: "ENDOCRINE" as const, description: "Trastorno del metabolismo de la glucosa" },
  { code: "ASTHMA", name: "Asma", category: "RESPIRATORY" as const, description: "Enfermedad respiratoria crónica" },
  { code: "GASTROESOPHAGEAL", name: "Reflujo gastroesofágico", category: "GASTROINTESTINAL" as const, description: "Enfermedad digestiva" },
  { code: "EPILEPSY", name: "Epilepsia", category: "NEUROLOGICAL" as const, description: "Trastorno neurológico" },
  { code: "APPENDECTOMY", name: "Apendicectomía", category: "SURGICAL_HISTORY" as const, description: "Cirugía previa" },
  { code: "SMOKING", name: "Tabaquismo", category: "SMOKING" as const, description: "Consumo de tabaco" },
  { code: "ALCOHOL", name: "Consumo de alcohol", category: "ALCOHOL" as const, description: "Consumo regular de alcohol" },
  { code: "HEART_DISEASE", name: "Enfermedad cardíaca", category: "CARDIOVASCULAR" as const, description: "Problemas cardíacos" },
  { code: "THYROID", name: "Trastorno tiroideo", category: "ENDOCRINE" as const, description: "Problemas de tiroides" },
];

export const ANAMNESIS_CONFIG_SAMPLES = [
  {
    key: "MANDATORY_FIRST_CONSULTATION",
    value: { enabled: true, requiredFields: ["motivoConsulta", "tieneDolorActual"] },
    description: "Campos obligatorios en primera consulta",
  },
  {
    key: "ALLOW_EDIT_SUBSEQUENT",
    value: { enabled: true, requireReview: true },
    description: "Permitir edición de anamnesis en consultas subsecuentes con revisión",
  },
  {
    key: "ANAMNESIS_EXPIRY_DAYS",
    value: { days: 365 },
    description: "Días de validez de una anamnesis antes de requerir actualización",
  },
  {
    key: "AUTO_REVIEW_THRESHOLD",
    value: { severity: "HIGH", autoApprove: false },
    description: "Umbral de severidad para revisión automática",
  },
];

/**
 * Catálogo de Planes de Tratamiento
 * 
 * NOTA: Los precios (estimatedCostCents) están en guaraníes (PYG), no en centavos.
 * Los códigos de procedimientos deben existir en PROCEDIMIENTOS_CATALOGO.
 */
export const TREATMENT_PLAN_CATALOG = [
  {
    code: "ORT-COMP",
    nombre: "Plan de Ortodoncia Completo",
    descripcion: "Tratamiento de ortodoncia completo con brackets metálicos, incluye consultas, controles y ajustes periódicos",
    isActive: true,
    steps: [
      {
        order: 1,
        procedureCode: "CONS-INI",
        notes: "Consulta inicial y evaluación ortodóncica",
        priority: 5,
        estimatedDurationMin: 30,
        estimatedCostCents: 180000,
      },
      {
        order: 2,
        procedureCode: "RX-PANO",
        notes: "Radiografía panorámica para diagnóstico",
        priority: 5,
        estimatedDurationMin: 15,
        estimatedCostCents: 130000,
      },
      {
        order: 3,
        procedureCode: "LIMP",
        notes: "Limpieza dental previa a la colocación de brackets",
        priority: 4,
        estimatedDurationMin: 40,
        estimatedCostCents: 200000,
      },
      {
        order: 4,
        serviceType: "Colocación de brackets superiores",
        notes: "Colocación de brackets metálicos en arcada superior",
        priority: 5,
        estimatedDurationMin: 60,
        estimatedCostCents: 2500000,
        requiresMultipleSessions: false,
      },
      {
        order: 5,
        serviceType: "Colocación de brackets inferiores",
        notes: "Colocación de brackets metálicos en arcada inferior",
        priority: 5,
        estimatedDurationMin: 60,
        estimatedCostCents: 2500000,
        requiresMultipleSessions: false,
      },
      {
        order: 6,
        serviceType: "Control y ajuste de brackets",
        notes: "Control mensual y ajuste de arcos",
        priority: 3,
        estimatedDurationMin: 30,
        estimatedCostCents: 150000,
        requiresMultipleSessions: true,
        totalSessions: 24,
      },
      {
        order: 7,
        serviceType: "Retiro de brackets",
        notes: "Retiro de brackets y limpieza final",
        priority: 4,
        estimatedDurationMin: 60,
        estimatedCostCents: 1800000,
        requiresMultipleSessions: false,
      },
      {
        order: 8,
        serviceType: "Fabricación y colocación de retenedores",
        notes: "Retenedores fijos y removibles",
        priority: 4,
        estimatedDurationMin: 45,
        estimatedCostCents: 1200000,
        requiresMultipleSessions: false,
      },
    ],
  },
  {
    code: "REHAB-COMP",
    nombre: "Rehabilitación Oral Completa",
    descripcion: "Plan completo de rehabilitación oral que incluye endodoncias, restauraciones y prótesis",
    isActive: true,
    steps: [
      {
        order: 1,
        procedureCode: "CONS-INI",
        notes: "Consulta inicial y evaluación completa",
        priority: 5,
        estimatedDurationMin: 30,
        estimatedCostCents: 180000,
      },
      {
        order: 2,
        procedureCode: "RX-PANO",
        notes: "Radiografía panorámica para diagnóstico completo",
        priority: 5,
        estimatedDurationMin: 15,
        estimatedCostCents: 130000,
      },
      {
        order: 3,
        procedureCode: "LIMP-PROF",
        notes: "Limpieza profunda y curetaje inicial",
        priority: 4,
        estimatedDurationMin: 60,
        estimatedCostCents: 450000,
      },
      {
        order: 4,
        procedureCode: "ENDO",
        toothNumber: 16,
        notes: "Endodoncia en pieza 16",
        priority: 5,
        estimatedDurationMin: 90,
        estimatedCostCents: 950000,
        requiresMultipleSessions: false,
      },
      {
        order: 5,
        procedureCode: "ENDO",
        toothNumber: 26,
        notes: "Endodoncia en pieza 26",
        priority: 5,
        estimatedDurationMin: 90,
        estimatedCostCents: 950000,
        requiresMultipleSessions: false,
      },
      {
        order: 6,
        procedureCode: "CORONA",
        toothNumber: 16,
        notes: "Corona metal-porcelana en pieza 16",
        priority: 4,
        estimatedDurationMin: 60,
        estimatedCostCents: 1300000,
        requiresMultipleSessions: false,
      },
      {
        order: 7,
        procedureCode: "CORONA",
        toothNumber: 26,
        notes: "Corona metal-porcelana en pieza 26",
        priority: 4,
        estimatedDurationMin: 60,
        estimatedCostCents: 1300000,
        requiresMultipleSessions: false,
      },
      {
        order: 8,
        procedureCode: "OBT",
        toothNumber: 14,
        toothSurface: "O",
        notes: "Obturación en pieza 14 superficie oclusal",
        priority: 3,
        estimatedDurationMin: 45,
        estimatedCostCents: 320000,
        requiresMultipleSessions: false,
      },
      {
        order: 9,
        procedureCode: "OBT",
        toothNumber: 24,
        toothSurface: "O",
        notes: "Obturación en pieza 24 superficie oclusal",
        priority: 3,
        estimatedDurationMin: 45,
        estimatedCostCents: 320000,
        requiresMultipleSessions: false,
      },
      {
        order: 10,
        procedureCode: "CTRL",
        notes: "Control post-tratamiento",
        priority: 2,
        estimatedDurationMin: 20,
        estimatedCostCents: 120000,
        requiresMultipleSessions: false,
      },
    ],
  },
  {
    code: "ENDO-REST",
    nombre: "Endodoncia y Restauración",
    descripcion: "Tratamiento de endodoncia seguido de restauración con corona",
    isActive: true,
    steps: [
      {
        order: 1,
        procedureCode: "CONS-INI",
        notes: "Consulta inicial y diagnóstico",
        priority: 5,
        estimatedDurationMin: 30,
        estimatedCostCents: 180000,
      },
      {
        order: 2,
        procedureCode: "RX-PERI",
        toothNumber: null,
        notes: "Radiografía periapical para evaluación",
        priority: 5,
        estimatedDurationMin: 10,
        estimatedCostCents: 70000,
      },
      {
        order: 3,
        procedureCode: "ENDO",
        toothNumber: null,
        notes: "Tratamiento de conducto radicular",
        priority: 5,
        estimatedDurationMin: 90,
        estimatedCostCents: 950000,
        requiresMultipleSessions: false,
      },
      {
        order: 4,
        procedureCode: "CTRL",
        notes: "Control post-endodoncia (1 semana)",
        priority: 4,
        estimatedDurationMin: 20,
        estimatedCostCents: 120000,
        requiresMultipleSessions: false,
      },
      {
        order: 5,
        procedureCode: "CORONA",
        toothNumber: null,
        notes: "Corona metal-porcelana para protección",
        priority: 4,
        estimatedDurationMin: 60,
        estimatedCostCents: 1300000,
        requiresMultipleSessions: false,
      },
      {
        order: 6,
        procedureCode: "CTRL",
        notes: "Control final post-restauración",
        priority: 3,
        estimatedDurationMin: 20,
        estimatedCostCents: 120000,
        requiresMultipleSessions: false,
      },
    ],
  },
  {
    code: "PERIO-TRAT",
    nombre: "Tratamiento Periodontal",
    descripcion: "Plan completo de tratamiento periodontal con curetajes y mantenimiento",
    isActive: true,
    steps: [
      {
        order: 1,
        procedureCode: "CONS-INI",
        notes: "Consulta inicial y evaluación periodontal",
        priority: 5,
        estimatedDurationMin: 30,
        estimatedCostCents: 180000,
      },
      {
        order: 2,
        procedureCode: "RX-PANO",
        notes: "Radiografía panorámica para evaluación ósea",
        priority: 5,
        estimatedDurationMin: 15,
        estimatedCostCents: 130000,
      },
      {
        order: 3,
        procedureCode: "LIMP",
        notes: "Limpieza dental inicial",
        priority: 4,
        estimatedDurationMin: 40,
        estimatedCostCents: 200000,
      },
      {
        order: 4,
        procedureCode: "CURET",
        toothNumber: null,
        notes: "Curetaje subgingival cuadrante 1",
        priority: 4,
        estimatedDurationMin: 60,
        estimatedCostCents: 400000,
        requiresMultipleSessions: false,
      },
      {
        order: 5,
        procedureCode: "CURET",
        toothNumber: null,
        notes: "Curetaje subgingival cuadrante 2",
        priority: 4,
        estimatedDurationMin: 60,
        estimatedCostCents: 400000,
        requiresMultipleSessions: false,
      },
      {
        order: 6,
        procedureCode: "CURET",
        toothNumber: null,
        notes: "Curetaje subgingival cuadrante 3",
        priority: 4,
        estimatedDurationMin: 60,
        estimatedCostCents: 400000,
        requiresMultipleSessions: false,
      },
      {
        order: 7,
        procedureCode: "CURET",
        toothNumber: null,
        notes: "Curetaje subgingival cuadrante 4",
        priority: 4,
        estimatedDurationMin: 60,
        estimatedCostCents: 400000,
        requiresMultipleSessions: false,
      },
      {
        order: 8,
        procedureCode: "CTRL",
        notes: "Control post-tratamiento (1 mes)",
        priority: 3,
        estimatedDurationMin: 20,
        estimatedCostCents: 120000,
        requiresMultipleSessions: false,
      },
      {
        order: 9,
        procedureCode: "LIMP",
        notes: "Mantenimiento periodontal (cada 3 meses)",
        priority: 3,
        estimatedDurationMin: 40,
        estimatedCostCents: 200000,
        requiresMultipleSessions: true,
        totalSessions: 4,
      },
    ],
  },
  {
    code: "IMPL-UNIT",
    nombre: "Implantología Unitaria",
    descripcion: "Plan de tratamiento para colocación de implante dental unitario con corona",
    isActive: true,
    steps: [
      {
        order: 1,
        procedureCode: "CONS-INI",
        notes: "Consulta inicial y evaluación para implante",
        priority: 5,
        estimatedDurationMin: 30,
        estimatedCostCents: 180000,
      },
      {
        order: 2,
        procedureCode: "RX-PANO",
        notes: "Radiografía panorámica para evaluación ósea",
        priority: 5,
        estimatedDurationMin: 15,
        estimatedCostCents: 130000,
      },
      {
        order: 3,
        procedureCode: "LIMP",
        notes: "Limpieza dental previa a cirugía",
        priority: 4,
        estimatedDurationMin: 40,
        estimatedCostCents: 200000,
      },
      {
        order: 4,
        serviceType: "Colocación de implante dental",
        toothNumber: null,
        notes: "Cirugía de colocación de implante",
        priority: 5,
        estimatedDurationMin: 90,
        estimatedCostCents: 3500000,
        requiresMultipleSessions: false,
      },
      {
        order: 5,
        procedureCode: "CTRL",
        notes: "Control post-operatorio (1 semana)",
        priority: 4,
        estimatedDurationMin: 20,
        estimatedCostCents: 120000,
        requiresMultipleSessions: false,
      },
      {
        order: 6,
        procedureCode: "CTRL",
        notes: "Control de osteointegración (3 meses)",
        priority: 4,
        estimatedDurationMin: 20,
        estimatedCostCents: 120000,
        requiresMultipleSessions: false,
      },
      {
        order: 7,
        serviceType: "Colocación de pilar de cicatrización",
        toothNumber: null,
        notes: "Segunda fase: colocación de pilar",
        priority: 4,
        estimatedDurationMin: 30,
        estimatedCostCents: 800000,
        requiresMultipleSessions: false,
      },
      {
        order: 8,
        procedureCode: "CORONA-ZIR",
        toothNumber: null,
        notes: "Corona de zirconio sobre implante",
        priority: 4,
        estimatedDurationMin: 60,
        estimatedCostCents: 2200000,
        requiresMultipleSessions: false,
      },
      {
        order: 9,
        procedureCode: "CTRL",
        notes: "Control final post-colocación de corona",
        priority: 3,
        estimatedDurationMin: 20,
        estimatedCostCents: 120000,
        requiresMultipleSessions: false,
      },
    ],
  },
];