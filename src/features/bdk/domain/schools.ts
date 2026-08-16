export const bdkSchools = [
  { id: "gymnasium-marianum-warburg", label: "Gymnasium Marianum Warburg" },
  { id: "hueffertgymnasium-warburg", label: "Hüffertgymnasium Warburg" },
  { id: "sekundarschule-warburg", label: "Sekundarschule Warburg" },
  { id: "sekundarschule-warburg-teilstandort-borgentreich", label: "Sekundarschule Warburg, Teilstandort Borgentreich" },
  { id: "johann-conrad-schlaun-berufskolleg", label: "Johann-Conrad-Schlaun-Berufskolleg des Kreises Höxter" },
  { id: "gymnasium-st-xaver-bad-driburg", label: "Gymnasium St. Xaver Bad Driburg" },
  { id: "gymnasium-st-kaspar-neuenheerse", label: "Gymnasium St. Kaspar Neuenheerse" },
  { id: "geschwister-scholl-gesamtschule-bad-driburg", label: "Geschwister-Scholl-Gesamtschule Bad Driburg" },
  { id: "schulen-der-brede-brakel", label: "Schulen der Brede Brakel" },
  { id: "staedtische-gesamtschule-brakel", label: "Städtische Gesamtschule Brakel" },
  { id: "sekundarschule-hoexter", label: "Sekundarschule Höxter" },
  { id: "koenig-wilhelm-gymnasium-hoexter", label: "König-Wilhelm-Gymnasium Höxter" },
  { id: "hoffmann-von-fallersleben-schule-hoexter", label: "Hoffmann-von-Fallersleben-Schule Höxter – Städtische Realschule" },
  { id: "berufskolleg-kreis-hoexter-standort-hoexter", label: "Berufskolleg Kreis Höxter – Standort Höxter" },
  { id: "peter-hille-schule-nieheim", label: "Peter-Hille-Schule Nieheim – Städtische Realschule" },
  { id: "staedtisches-gymnasium-steinheim", label: "Städtisches Gymnasium Steinheim" },
  { id: "staedtische-realschule-steinheim", label: "Städtische Realschule Steinheim" },
  { id: "staedtisches-gymnasium-beverungen", label: "Städtisches Gymnasium Beverungen" },
  { id: "sekundarschule-drei-laender-eck-beverungen", label: "Sekundarschule im Drei-Länder-Eck Beverungen" },
  { id: "eggeschule-willebadessen", label: "Eggeschule Willebadessen – Sekundarschule" },
] as const;

export const bdkSchoolIds = bdkSchools.map((school) => school.id) as [string, ...string[]];

export function bdkSchoolLabel(id: string, other = "") {
  return id === "other" ? other : bdkSchools.find((school) => school.id === id)?.label ?? id;
}
