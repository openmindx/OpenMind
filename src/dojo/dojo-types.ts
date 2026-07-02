export type DojoStatus = 'idle' | 'streaming' | 'done' | 'error';

export interface DojoRubric {
  accuracy: boolean;
  conciseness: boolean;
  reasoning: boolean;
  codeCorrectness: boolean;
}

export const DEFAULT_RUBRIC: DojoRubric = {
  accuracy: true,
  conciseness: true,
  reasoning: true,
  codeCorrectness: false,
};

export interface ModelResponse {
  model: string;
  content: string;
  latencyMs: number | null;
  status: DojoStatus;
  error?: string;
}

export interface ModelScore {
  model: string;
  accuracy: number;
  conciseness: number;
  reasoning: number;
  codeCorrectness: number;
  overall: number;
  justification: string;
}

export interface DojoRound {
  id: string;
  prompt: string;
  responses: ModelResponse[];
  judgeModel: string;
  scores: ModelScore[] | null;
  blindMode: boolean;
  createdAt: Date;
}

export interface ScoreboardEntry {
  model: string;
  wins: number;
  rounds: number;
  totalOverall: number;
}

export const BLIND_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;

// Martial-arts belt ranks — used to color Dojo contestants and scoreboard ranks.
export interface Belt {
  name: string;
  color: string;  // belt background
  text: string;   // readable text on that belt
}

export const BELTS: Belt[] = [
  { name: 'White',  color: '#eaeaea', text: '#111111' },
  { name: 'Yellow', color: '#ffd600', text: '#111111' },
  { name: 'Orange', color: '#ff9100', text: '#111111' },
  { name: 'Green',  color: '#4caf50', text: '#08240f' },
  { name: 'Blue',   color: '#2196f3', text: '#ffffff' },
  { name: 'Purple', color: '#9c27b0', text: '#ffffff' },
  { name: 'Brown',  color: '#795548', text: '#ffffff' },
  { name: 'Red',    color: '#f44336', text: '#ffffff' },
  { name: 'Black',  color: '#1a1a1a', text: '#ffffff' },
];

/** Belt by contestant order (white → up). Wraps if there are more than 9. */
export const beltFor = (i: number): Belt => BELTS[i % BELTS.length];

/** Belt by finishing rank (0 = 1st place = black belt, descending). */
export const beltForRank = (rankIndex: number): Belt =>
  BELTS[Math.max(0, BELTS.length - 1 - rankIndex)];

export const PROMPT_PRESETS: Array<{ label: string; prompt: string }> = [
  {
    label: 'Code challenge',
    prompt: 'Write a Python function that finds all prime numbers up to N using the Sieve of Eratosthenes. Include type hints and a brief explanation of the algorithm.',
  },
  {
    label: 'Logic puzzle',
    prompt: 'Three boxes are labeled "Apples", "Oranges", and "Mixed". All three labels are wrong. You may pick one fruit from one box without looking inside. How do you correctly label all three boxes? Explain your reasoning step by step.',
  },
  {
    label: 'Explain concept',
    prompt: 'Explain how the transformer self-attention mechanism works to a software engineer who has never studied machine learning. Use one concrete analogy and keep it under 200 words.',
  },
  {
    label: 'Debug challenge',
    prompt: 'This Python function has a subtle bug:\n\ndef flatten(lst, result=[]):\n    for item in lst:\n        if isinstance(item, list):\n            flatten(item, result)\n        else:\n            result.append(item)\n    return result\n\nIdentify the bug, explain exactly why it occurs, and provide a corrected version.',
  },
  {
    label: 'Debate position',
    prompt: 'Make the strongest possible argument that functional programming is superior to object-oriented programming for building modern backend services.',
  },
];
