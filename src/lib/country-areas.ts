// Country → main areas reference data.
// Used by the event form's cascading Country / City-Area dropdowns.
// Merged with any rows in the `country_areas` table when it exists.

export const COUNTRY_AREAS: Record<string, string[]> = {
  Lebanon: [
    "Beirut", "Mount Lebanon", "North Lebanon / Tripoli", "South Lebanon / Saida",
    "Bekaa / Zahle", "Nabatieh", "Jbeil / Byblos", "Kesrouan / Jounieh",
    "Aley / Chouf", "Batroun",
  ],
  Jordan: ["Amman", "Zarqa", "Irbid", "Aqaba", "Madaba", "Karak", "Jerash", "Salt / Balqa"],
  Egypt: ["Cairo", "Giza", "Alexandria", "Luxor", "Aswan", "Port Said", "Suez", "Mansoura", "Tanta", "Asyut", "Minya"],
  Iraq: ["Baghdad", "Erbil", "Basra", "Mosul", "Kirkuk", "Najaf", "Karbala", "Duhok"],
  Turkey: ["Istanbul", "Ankara", "Izmir", "Gaziantep", "Mersin", "Antalya", "Bursa"],
  Morocco: ["Casablanca", "Rabat", "Marrakesh", "Fes", "Tangier", "Agadir"],
  Syria: ["Damascus", "Aleppo", "Homs", "Latakia"],
  "United Arab Emirates": ["Dubai", "Abu Dhabi", "Sharjah"],
  Kuwait: ["Kuwait City"],
  "Saudi Arabia": ["Riyadh", "Jeddah"],
  Tunisia: ["Tunis"],
  Algeria: ["Algiers"],
  Cyprus: ["Nicosia"],
  France: ["Paris"],
  "United Kingdom": ["London"],
};

export const COUNTRY_LIST = Object.keys(COUNTRY_AREAS).sort();

/** Areas for a country: DB rows (if any) merged with the static list. */
export function areasForCountry(country: string, dbAreas: { country: string; area: string }[] = []): string[] {
  const staticAreas = COUNTRY_AREAS[country] ?? [];
  const fromDb = dbAreas.filter((a) => a.country === country).map((a) => a.area);
  return [...new Set([...staticAreas, ...fromDb])].sort();
}
