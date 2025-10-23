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

export const PROCEDIMIENTOS_CATALOGO: Array<{
  code: string;
  nombre: string;
  descripcion?: string;
  defaultDurationMin?: number | null;
  defaultPriceCents?: number | null;
  aplicaDiente?: boolean;
  aplicaSuperficie?: boolean;
}> = [
  { code: "CONS-INI", nombre: "Consulta inicial", descripcion: "Evaluación y diagnóstico", defaultDurationMin: 30, defaultPriceCents: 120000, aplicaDiente: false, aplicaSuperficie: false },
  { code: "LIMP",     nombre: "Limpieza",         descripcion: "Profilaxis",             defaultDurationMin: 40, defaultPriceCents: 150000, aplicaDiente: false, aplicaSuperficie: false },
  { code: "OBT",      nombre: "Obturación",       descripcion: "Resina compuesta",       defaultDurationMin: 45, defaultPriceCents: 220000, aplicaDiente: true,  aplicaSuperficie: true  },
  { code: "ENDO",     nombre: "Endodoncia",       descripcion: "Tratamiento conducto",   defaultDurationMin: 90, defaultPriceCents: 650000, aplicaDiente: true,  aplicaSuperficie: false },
  { code: "EXT",      nombre: "Extracción",       descripcion: "Simple",                 defaultDurationMin: 30, defaultPriceCents: 180000, aplicaDiente: true,  aplicaSuperficie: false },
  { code: "CTRL",     nombre: "Control",          descripcion: "Seguimiento",            defaultDurationMin: 20, defaultPriceCents:  80000, aplicaDiente: false, aplicaSuperficie: false },
];