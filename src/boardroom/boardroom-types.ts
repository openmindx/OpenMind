// ─── Agent Roles ─────────────────────────────────────────────────────────────

export type AgentRole =
  | 'advocate'
  | 'critic'
  | 'analyst'
  | "devil's advocate"
  | 'expert'
  | 'generalist';

export interface RoleConfig {
  label: string;
  color: string;       // CSS hex for panel accent
  systemPrompt: string;
}

export const ROLES: Record<AgentRole, RoleConfig> = {
  advocate: {
    label: 'Advocate',
    color: '#4caf50',
    systemPrompt:
      'You are an advocate. Make the strongest possible case in favor of the proposed idea or solution. Highlight benefits, opportunities, and positive outcomes. Be persuasive and constructive.',
  },
  critic: {
    label: 'Critic',
    color: '#f44336',
    systemPrompt:
      'You are a critic. Identify weaknesses, risks, and flaws in the proposed idea or solution. Challenge assumptions and surface problems that others might overlook. Be rigorous and honest.',
  },
  analyst: {
    label: 'Analyst',
    color: '#2196f3',
    systemPrompt:
      'You are an analyst. Examine the proposal objectively with data-driven reasoning. Break it down into components, evaluate trade-offs, and present a balanced, structured assessment.',
  },
  "devil's advocate": {
    label: "Devil's Advocate",
    color: '#ff9800',
    systemPrompt:
      "You are a devil's advocate. Deliberately argue the opposite of the prevailing view to stress-test ideas. Surface uncomfortable counter-arguments and alternative perspectives.",
  },
  expert: {
    label: 'Expert',
    color: '#9c27b0',
    systemPrompt:
      'You are a domain expert. Bring deep technical or domain-specific knowledge to bear. Focus on accuracy, nuance, and edge cases that a generalist might miss.',
  },
  generalist: {
    label: 'Generalist',
    color: '#607d8b',
    systemPrompt:
      'You are a generalist. Offer a broad, accessible perspective informed by cross-domain thinking. Prioritize clarity and practical takeaways over technical depth.',
  },
};

export const ALL_ROLES = Object.keys(ROLES) as AgentRole[];

// ─── Agent Config & Response ──────────────────────────────────────────────────

export interface AgentConfig {
  id: string;          // crypto.randomUUID()
  model: string;
  role: AgentRole;
  customPrompt?: string; // overrides role system prompt when set
}

export type AgentStatus = 'idle' | 'streaming' | 'done' | 'error';

export interface AgentResponse {
  agentId: string;
  model: string;
  role: AgentRole;
  content: string;
  latencyMs: number | null;
  status: AgentStatus;
  error?: string;
}

// ─── Consensus ────────────────────────────────────────────────────────────────

export interface ConsensusState {
  content: string;
  status: AgentStatus;
  latencyMs: number | null;
  synthesizerModel: string;
  error?: string;
}

// ─── Session ──────────────────────────────────────────────────────────────────

export interface BoardroomSession {
  id: string;
  prompt: string;
  agents: AgentConfig[];
  responses: AgentResponse[];
  consensus: ConsensusState | null;
  createdAt: Date;
}

// ─── Preset Boards ────────────────────────────────────────────────────────────

export interface PresetBoard {
  label: string;
  description: string;
  agents: Array<{ role: AgentRole }>;
}

export const PRESET_BOARDS: PresetBoard[] = [
  {
    label: 'Classic Triad',
    description: 'Advocate · Critic · Analyst',
    agents: [{ role: 'advocate' }, { role: 'critic' }, { role: 'analyst' }],
  },
  {
    label: "Devil's Court",
    description: 'Advocate · Analyst · Devil\'s Advocate',
    agents: [{ role: 'advocate' }, { role: 'analyst' }, { role: "devil's advocate" }],
  },
  {
    label: 'Full Board',
    description: 'All six roles',
    agents: [
      { role: 'advocate' },
      { role: 'critic' },
      { role: 'analyst' },
      { role: "devil's advocate" },
      { role: 'expert' },
      { role: 'generalist' },
    ],
  },
  {
    label: 'Peer Review',
    description: 'Expert · Critic · Generalist',
    agents: [{ role: 'expert' }, { role: 'critic' }, { role: 'generalist' }],
  },
];

// ─── Prompt Presets ───────────────────────────────────────────────────────────

export const PROMPT_PRESETS: Array<{ label: string; prompt: string }> = [
  {
    label: 'Microservices vs monolith',
    prompt:
      'Should our team migrate from a monolithic architecture to microservices? Evaluate the trade-offs given a team of 8 engineers and a product with 50,000 daily active users.',
  },
  {
    label: 'AI in hiring',
    prompt:
      'Should companies use AI-powered resume screening and interview scoring tools in their hiring process? Discuss benefits, risks, and ethical implications.',
  },
  {
    label: 'Remote-first policy',
    prompt:
      'Should a 200-person software company adopt a fully remote-first policy, eliminating its physical office? Weigh the impact on culture, productivity, and talent acquisition.',
  },
  {
    label: 'Open source the product',
    prompt:
      'Should a profitable SaaS startup open-source its core product? Analyse the business model, competitive, and community implications.',
  },
  {
    label: 'Rewrite in Rust',
    prompt:
      'Our Python backend handles 10,000 req/s at 70% CPU. Should we rewrite it in Rust? Consider performance, developer experience, risk, and time to market.',
  },
];
