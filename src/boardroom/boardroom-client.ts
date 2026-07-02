import type { AgentConfig, AgentResponse } from './boardroom-types';
import { ROLES } from './boardroom-types';
import { resolveEndpoint, describeError } from '../lib/ollama-client';

// Re-export type so consumers don't need to import from two places
export type { AgentConfig, AgentResponse };

// ─── streamAgentResponse ──────────────────────────────────────────────────────

/**
 * Stream a single agent's response via POST /api/chat.
 * The agent's role injects a system prompt that shapes the perspective.
 *
 * @returns latencyMs from first token to done
 */
export async function streamAgentResponse(
  agent: AgentConfig,
  prompt: string,
  onToken: (token: string) => void,
  signal: AbortSignal,
): Promise<number> {
  const systemPrompt = agent.customPrompt ?? ROLES[agent.role].systemPrompt;
  const { url, headers } = resolveEndpoint(agent.model);

  const res = await fetch(`${url}/api/chat`, {
    method: 'POST',
    headers,
    signal,
    body: JSON.stringify({
      model: agent.model,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(await describeError(res, agent.model));
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  const start = Date.now();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.message?.content) {
          onToken(parsed.message.content);
        }
        if (parsed.done) {
          return Date.now() - start;
        }
      } catch {
        // partial JSON chunk — skip
      }
    }
  }

  return Date.now() - start;
}

// ─── streamConsensus ──────────────────────────────────────────────────────────

/**
 * Ask a synthesizer model to build consensus from all agent responses.
 * Streams tokens to onToken. Returns latencyMs.
 *
 * Output is structured markdown:
 *   ## Consensus
 *   ## Points of Agreement
 *   ## Points of Divergence
 *   ## Recommendation
 */
export async function streamConsensus(
  prompt: string,
  responses: AgentResponse[],
  synthesizerModel: string,
  onToken: (token: string) => void,
  signal: AbortSignal,
): Promise<number> {
  const agentSections = responses
    .filter(r => r.status === 'done' && r.content)
    .map(r => `=== ${ROLES[r.role].label} (${r.model}) ===\n${r.content}`)
    .join('\n\n');

  const synthesisPrompt = `You are a neutral facilitator synthesizing a boardroom discussion.

ORIGINAL PROMPT:
${prompt}

ADVISOR RESPONSES:
${agentSections}

Produce a structured synthesis using exactly these four markdown headings in order:

## Consensus
What all or most advisors agree on.

## Points of Agreement
Specific shared conclusions or supporting arguments.

## Points of Divergence
Key disagreements or tensions between advisors.

## Recommendation
A clear, actionable recommendation that weighs all perspectives.

Be concise. Each section should be 2–5 sentences or a short bullet list.`;

  const { url, headers } = resolveEndpoint(synthesizerModel);
  const res = await fetch(`${url}/api/chat`, {
    method: 'POST',
    headers,
    signal,
    body: JSON.stringify({
      model: synthesizerModel,
      stream: true,
      messages: [
        { role: 'user', content: synthesisPrompt },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(await describeError(res, synthesizerModel));
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  const start = Date.now();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.message?.content) {
          onToken(parsed.message.content);
        }
        if (parsed.done) {
          return Date.now() - start;
        }
      } catch {
        // partial chunk — skip
      }
    }
  }

  return Date.now() - start;
}
