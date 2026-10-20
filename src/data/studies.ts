/**
 * Catálogo visual de ejemplo.
 *
 * Solo contiene nombres de estudios de uso común para demostrar el buscador y
 * las categorías. No incluye precios, tiempos de entrega ni indicaciones de
 * preparación: esos datos deben provenir del catálogo autorizado del
 * laboratorio antes de publicarse.
 */

export type CategoryId = "generales" | "geneticos" | "especializados" | "perfiles";

export type Category = {
  id: CategoryId;
  name: string;
  description: string;
  tone: "blue" | "turquoise" | "coral";
};

export type Study = {
  id: string;
  name: string;
  category: CategoryId;
  aliases: string[];
};

export const categories: Category[] = [
  {
    id: "generales",
    name: "Análisis clínicos generales",
    description: "Estudios de rutina para conocer tu estado general de salud.",
    tone: "blue",
  },
  {
    id: "geneticos",
    name: "Estudios genéticos",
    description: "Análisis enfocados en información genética y molecular.",
    tone: "turquoise",
  },
  {
    id: "especializados",
    name: "Estudios especializados",
    description: "Pruebas específicas solicitadas por tu médico.",
    tone: "coral",
  },
  {
    id: "perfiles",
    name: "Perfiles",
    description: "Grupos de estudios que se realizan en conjunto.",
    tone: "blue",
  },
];

export const studies: Study[] = [
  { id: "biometria-hematica", name: "Biometría hemática", category: "generales", aliases: ["bh", "hemograma", "citometría"] },
  { id: "quimica-sanguinea", name: "Química sanguínea", category: "generales", aliases: ["qs", "química"] },
  { id: "glucosa", name: "Glucosa", category: "generales", aliases: ["azúcar", "glucemia"] },
  { id: "examen-general-orina", name: "Examen general de orina", category: "generales", aliases: ["ego", "orina", "urianálisis"] },
  { id: "colesterol", name: "Colesterol total", category: "generales", aliases: ["colesterol"] },
  { id: "trigliceridos", name: "Triglicéridos", category: "generales", aliases: ["grasas"] },
  { id: "acido-urico", name: "Ácido úrico", category: "generales", aliases: ["urico"] },
  { id: "grupo-rh", name: "Grupo sanguíneo y factor Rh", category: "generales", aliases: ["tipo de sangre", "rh"] },

  { id: "pcr-molecular", name: "Pruebas de biología molecular (PCR)", category: "geneticos", aliases: ["pcr", "molecular"] },
  { id: "cariotipo", name: "Cariotipo", category: "geneticos", aliases: ["cromosomas"] },
  { id: "panel-genetico", name: "Paneles genéticos", category: "geneticos", aliases: ["genética", "adn"] },
  { id: "paternidad", name: "Estudios de parentesco", category: "geneticos", aliases: ["paternidad", "adn"] },

  { id: "hemoglobina-glucosilada", name: "Hemoglobina glucosilada (HbA1c)", category: "especializados", aliases: ["hba1c", "a1c"] },
  { id: "tsh", name: "Hormona estimulante de tiroides (TSH)", category: "especializados", aliases: ["tsh", "tiroides"] },
  { id: "antigeno-prostatico", name: "Antígeno prostático específico", category: "especializados", aliases: ["ape", "psa", "próstata"] },
  { id: "vitamina-d", name: "Vitamina D", category: "especializados", aliases: ["25-oh", "vitamina"] },
  { id: "marcadores-tumorales", name: "Marcadores tumorales", category: "especializados", aliases: ["marcadores", "oncológicos"] },
  { id: "cultivos", name: "Cultivos microbiológicos", category: "especializados", aliases: ["cultivo", "microbiología"] },

  { id: "perfil-hepatico", name: "Perfil hepático", category: "perfiles", aliases: ["hígado", "pfh", "funcion hepatica"] },
  { id: "perfil-lipidos", name: "Perfil de lípidos", category: "perfiles", aliases: ["lipídico", "colesterol", "triglicéridos"] },
  { id: "perfil-tiroideo", name: "Perfil tiroideo", category: "perfiles", aliases: ["tiroides", "t3", "t4"] },
  { id: "perfil-renal", name: "Perfil renal", category: "perfiles", aliases: ["riñón", "creatinina", "urea"] },
  { id: "perfil-prenatal", name: "Perfil prenatal", category: "perfiles", aliases: ["embarazo", "prenatal"] },
  { id: "check-up", name: "Perfil chequeo general", category: "perfiles", aliases: ["check up", "chequeo"] },
];

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

/** Búsqueda por nombre o alias, sin acentos y con coincidencias parciales. */
export function searchStudies(query: string, category?: CategoryId | null): Study[] {
  const q = normalize(query);
  return studies.filter((s) => {
    if (category && s.category !== category) return false;
    if (!q) return true;
    return [s.name, ...s.aliases].some((t) => normalize(t).includes(q));
  });
}
