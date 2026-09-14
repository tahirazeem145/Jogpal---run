export interface TransformationPhoto {
  dayNumber: number; // 1 to 30
  imageUri: string;
  dateUploaded: string; // ISO string or formatted date
  notes?: string;
  weightKg?: string;
}

export type TransformationMap = Record<number, TransformationPhoto>;
