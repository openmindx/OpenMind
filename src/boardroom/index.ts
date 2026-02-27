export { BoardroomPage } from './BoardroomPage';

export type {
  AgentRole,
  RoleConfig,
  AgentConfig,
  AgentStatus,
  AgentResponse,
  ConsensusState,
  BoardroomSession,
  PresetBoard,
} from './boardroom-types';

export {
  ROLES,
  ALL_ROLES,
  PRESET_BOARDS,
  PROMPT_PRESETS,
} from './boardroom-types';

export { streamAgentResponse, streamConsensus } from './boardroom-client';
