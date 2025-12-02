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

export const PROCEDIMIENTOS_CATALOGO = [
  { code: "CONS-INI", nombre: "Consulta inicial", descripcion: "Evaluación y diagnóstico", defaultDurationMin: 30, defaultPriceCents: 120000, aplicaDiente: false, aplicaSuperficie: false, esCirugia: false },
  { code: "LIMP",     nombre: "Limpieza",         descripcion: "Profilaxis",             defaultDurationMin: 40, defaultPriceCents: 150000, aplicaDiente: false, aplicaSuperficie: false, esCirugia: false },
  { code: "OBT",      nombre: "Obturación",       descripcion: "Resina compuesta",       defaultDurationMin: 45, defaultPriceCents: 220000, aplicaDiente: true,  aplicaSuperficie: true,  esCirugia: false },
  { code: "ENDO",     nombre: "Endodoncia",       descripcion: "Tratamiento conducto",   defaultDurationMin: 90, defaultPriceCents: 650000, aplicaDiente: true,  aplicaSuperficie: false, esCirugia: false },
  { code: "EXT",      nombre: "Extracción",       descripcion: "Simple",                 defaultDurationMin: 30, defaultPriceCents: 180000, aplicaDiente: true,  aplicaSuperficie: false, esCirugia: true },
  { code: "CTRL",     nombre: "Control",          descripcion: "Seguimiento",            defaultDurationMin: 20, defaultPriceCents:  80000, aplicaDiente: false, aplicaSuperficie: false, esCirugia: false },
];

export const DIAGNOSIS_CATALOG = [
  { code: "K02.0", name: "Caries limitada al esmalte", description: "Caries inicial" },
  { code: "K02.1", name: "Caries dental", description: "Caries de la dentina" },
  { code: "K04.0", name: "Pulpite", description: "Inflamación de la pulpa dental" },
  { code: "K04.1", name: "Necrosis pulpar", description: "Muerte del tejido pulpar" },
  { code: "K05.0", name: "Gingivitis aguda", description: "Inflamación aguda de encías" },
  { code: "K05.1", name: "Gingivitis crónica", description: "Inflamación crónica de encías" },
  { code: "K05.3", name: "Periodontitis crónica", description: "Enfermedad periodontal crónica" },
  { code: "K08.1", name: "Pérdida de dientes por accidente", description: "Pérdida traumática" },
  { code: "K10.2", name: "Enfermedad inflamatoria de los maxilares", description: "Inflamación maxilar" },
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
