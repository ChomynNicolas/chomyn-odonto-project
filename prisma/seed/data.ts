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
  { code: "K02.1", name: "Caries dental" },
  { code: "K04.0", name: "Pulpite" },
  { code: "K05.3", name: "Periodontitis crónica" },
];

export const ALLERGY_CATALOG = [
  { name: "Lidocaína" },
  { name: "Penicilina" },
  { name: "Latex" },
];

export const MEDICATION_CATALOG = [
  { name: "Ibuprofeno 400 mg" },
  { name: "Amoxicilina 500 mg" },
  { name: "Paracetamol 500 mg" },
];
