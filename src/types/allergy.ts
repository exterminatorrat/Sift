export type AllergySeverity = "mild" | "moderate" | "severe";

export type Allergy = {
  id: string;
  name: string;
  severity: AllergySeverity;
  avoidCrossContact: boolean;
  notes?: string;
};

export type UserProfile = {
  id: string;
  name: string;
  allergies: Allergy[];
  preferredLanguage: string;
  restaurantLanguage?: string;
};
