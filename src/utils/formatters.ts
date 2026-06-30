import { Allergy } from "../types/allergy";

export function formatAllergySummary(allergies: Allergy[]) {
  if (allergies.length === 0) {
    return "No allergies added yet";
  }

  return allergies.map((allergy) => allergy.name).join(", ");
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}
