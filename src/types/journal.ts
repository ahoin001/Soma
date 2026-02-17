/** Fixed body measurement types for charting and listing. */
export const JOURNAL_MEASUREMENT_TYPES = [
  "body_weight",
  "neck",
  "shoulders",
  "chest",
  "left_bicep",
  "right_bicep",
  "left_forearm",
  "right_forearm",
  "waist",
  "hips",
  "left_thigh",
  "right_thigh",
  "left_calf",
  "right_calf",
] as const;

export type JournalMeasurementType = (typeof JOURNAL_MEASUREMENT_TYPES)[number];

export type BodyMeasurementEntry = {
  id: string;
  measurement_type: JournalMeasurementType;
  value: number;
  unit: string;
  logged_at: string;
  notes?: string;
  created_at: string;
};

export type ProgressPhoto = {
  id: string;
  image_url: string;
  taken_at: string;
  note?: string;
  created_at: string;
};

/** Human-readable labels for measurement types (for UI). */
export const MEASUREMENT_TYPE_LABELS: Record<JournalMeasurementType, string> = {
  body_weight: "Body weight",
  neck: "Neck",
  shoulders: "Shoulders",
  chest: "Chest",
  left_bicep: "Left bicep",
  right_bicep: "Right bicep",
  left_forearm: "Left forearm",
  right_forearm: "Right forearm",
  waist: "Waist",
  hips: "Hips",
  left_thigh: "Left thigh",
  right_thigh: "Right thigh",
  left_calf: "Left calf",
  right_calf: "Right calf",
};
