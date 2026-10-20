export type StudyRow = {
  id: string;
  code: string;
  name: string;
  synonyms: string[];
  categoryId: string;
  categoryName: string;
  sampleType: string | null;
  sampleTypeValidated: boolean;
  instructions: string | null;
  instructionsApproved: boolean;
  turnaround: string | null;
  turnaroundConfirmed: boolean;
  active: boolean;
  isDemo: boolean;
  publicCents: number | null;
  /** Solo presente si el usuario tiene catalog.viewCost. */
  costCents?: number | null;
};

export type CategoryOption = { id: string; key: string; name: string };
