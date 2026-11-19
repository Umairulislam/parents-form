export const ZILA_TOWNS = {
  Airport: ["Gadap Town", "Malir Cantt", "Model Colony Town", "Shah Faisal Town"],
  Kemari: ["Baldia Town", "Maripur Town", "Moriro Mirbahar"],
  Qaideen: ["Chanesar Town", "Jinnah Town"],
  Sharqi: ["Faisal Cantt", "Gulshan Town", "Safoora Town"],
  Gharbi: ["Manghopir Town", "Mominabad Town", "Orangi Town"],
  "Site Gharbi": ["Moriro Mirbahar", "Mominabad Town"],
  Shumali: ["New Karachi Town", "Manghopir Town"],
  Gadap: ["Sohrab Goth Town", "Gadap Town", "Manghopir Town"],
  Junubi: ["Clifton Cantt", "Karachi Cantt", "Lyari Town", "Manora Cantt", "Saddar Town"],
  Malir: ["Malir Town", "Gadap Town"],
  "Gulberg Wasti": ["Liaquatabad Town", "Gulberg Town"],
  Wasti: ["Nazimabad Town", "North Nazimabad Town"],
  Korangi: [
    "Shah Faisal Town",
    "Korangi Cantt",
    "Korangi Town",
    "Landhi Town",
    "Ibrahim Hyderi Town",
  ],
} as const

export type Zila = keyof typeof ZILA_TOWNS

export const ZILAS = Object.keys(ZILA_TOWNS) as [Zila, ...Zila[]]

// All towns without repeats, for the admin filter when no zila is chosen
export const ALL_TOWNS: string[] = Array.from(new Set(Object.values(ZILA_TOWNS).flat())).sort()

// Towns for one zila. Empty list if the zila is empty or unknown.
export function townsForZila(zila: string): readonly string[] {
  return (ZILA_TOWNS as Record<string, readonly string[]>)[zila] ?? []
}

export const BOOK_OPTIONS = [
  { value: "exchange", label: "Books Exchange" },
  { value: "given", label: "Books Given" },
] as const

export const CLASS_LEVELS = [
  "Class 1",
  "Class 2",
  "Class 3",
  "Class 4",
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
  "Higher Secondary (HSC)",
  "University (BS / MBBS / BCom)",
  "Masters (MS)",
] as const
