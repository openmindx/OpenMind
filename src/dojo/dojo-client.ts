/**
 * dojo-client.ts
 * Core logic: fan-out streaming to N models, judge scoring.
 */

import { ModelResponse, ModelScore, DojoRubric, BLIND_LABELS } from './dojo-types';
import { resolveEndpoint, describeError } from '../lib/ollama-client';

/**
 * Stream a single model response token-by-token via Ollama /api/chat.
 * Routes to local Ollama or Ollama Cloud based on the model name.
 * Returns total latency in ms when complete.
 */
export async function streamModelResponse(
  model: string,
  prompt: string,
  onToken: (token: string) => void,
  signal: AbortSignal,
): Promise<number> {
  const start = performance.now();
  const { url, headers } = resolveEndpoint(model);

  const res = await fetch(`${url}/api/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    }),
    signal,
  });

  if (!res.ok) {
    throw new Error(await describeError(res, model));
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const data = JSON.parse(line);
        if (data.message?.content) onToken(data.message.content);
        if (data.done) return Math.round(performance.now() - start);
      } catch {
        // ignore malformed lines
      }
    }
  }

  return Math.round(performance.now() - start);
}

/**
 * Send all model responses to a judge model for scoring.
 * In blind mode, models are labeled A/B/C… so the judge can't identify them by name.
 */
export async function runJudge(
  prompt: string,
  responses: ModelResponse[],
  judgeModel: string,
  rubric: DojoRubric,
  blindMode: boolean,
): Promise<ModelScore[]> {
  // Build label <-> model maps
  const labelToModel: Record<string, string> = {};
  const modelToLabel: Record<string, string> = {};
  responses.forEach((r, i) => {
    const label = blindMode ? `Model ${BLIND_LABELS[i]}` : r.model;
    labelToModel[label] = r.model;
    modelToLabel[r.model] = label;
  });

  const criteriaLines = [
    rubric.accuracy      && '- accuracy (1-10): factual correctness and relevance to the prompt',
    rubric.conciseness   && '- conciseness (1-10): appropriate length, no filler or repetition',
    rubric.reasoning     && '- reasoning (1-10): clarity of logic and step-by-step explanation',
    rubric.codeCorrectness && '- codeCorrectness (1-10): syntactic and semantic correctness of any code',
  ].filter(Boolean).join('\n');

  const scoreFields = [
    rubric.accuracy        && '"accuracy": <1-10>',
    rubric.conciseness     && '"conciseness": <1-10>',
    rubric.reasoning       && '"reasoning": <1-10>',
    rubric.codeCorrectness && '"codeCorrectness": <1-10>',
  ].filter(Boolean).join(', ');

  const responseBlocks = responses
    .map(r => `=== ${modelToLabel[r.model]} ===\n${r.content}`)
    .join('\n\n');

  const validLabels = responses.map(r => `"${modelToLabel[r.model]}"`).join(', ');

  const judgePrompt = `You are an impartial AI evaluator. Score each response to the prompt below on the stated criteria.

PROMPT:
${prompt}

RESPONSES:
${responseBlocks}

SCORING CRITERIA (each 1–10):
${criteriaLines}
- overall (1-10): holistic quality

INSTRUCTIONS:
- Respond ONLY with a valid JSON array. No text before or after the JSON.
- The "model" field must exactly match one of: ${validLabels}
- Give a concise one-sentence justification per response.

[
  {"model": <label>, ${scoreFields}, "overall": <1-10>, "justification": "<one sentence>"},
  ...
]`;

  const { url, headers } = resolveEndpoint(judgeModel);
  const res = await fetch(`${url}/api/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: judgeModel,
      messages: [{ role: 'user', content: judgePrompt }],
      stream: false,
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) throw new Error(`Judge failed — ${await describeError(res, judgeModel)}`);

  const data = await res.json();
  const raw: string = data.message?.content ?? data.response ?? '';

  // Extract JSON array even if the model wraps it in prose
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) {
    throw new Error(`Judge did not return a JSON array. Got: ${raw.slice(0, 300)}`);
  }

  const parsed: Array<Record<string, unknown>> = JSON.parse(match[0]);

  return parsed.map((item, i) => {
    const label = String(item.model ?? '');
    const actualModel = labelToModel[label] ?? responses[i]?.model ?? label;
    return {
      model: actualModel,
      accuracy:        Number(item.accuracy        ?? 5),
      conciseness:     Number(item.conciseness     ?? 5),
      reasoning:       Number(item.reasoning       ?? 5),
      codeCorrectness: Number(item.codeCorrectness ?? 5),
      overall:         Number(item.overall         ?? 5),
      justification:   String(item.justification   ?? ''),
    };
  });
}
