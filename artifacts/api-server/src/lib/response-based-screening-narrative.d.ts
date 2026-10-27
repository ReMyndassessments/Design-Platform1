export interface NarrativeResponseItem {
  prompt: string | null;
  response: string | null;
  options: string[];
}

interface NarrativeInput {
  instrument: string;
  answered: number;
  total: number | null;
  items: NarrativeResponseItem[];
}

export declare function buildResponseBasedScreeningNarrative(input: NarrativeInput): string;
