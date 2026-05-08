export interface Env {
  AI: Ai;
}

interface AskRequest {
  question: string;
  context: {
    phase: number;
    phaseName: string;
    currentMove: string;
    explanation: string;
    language?: string;
  };
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const body: AskRequest = await request.json();
    const { question, context } = body;
    const lang = context.language === 'sv' ? 'sv' : 'en';

    const systemPrompt = lang === 'sv'
      ? `Du är en hjälpsam Rubiks kub-tutor. \
Svara alltid på svenska. Håll svaret kort — max 3 meningar. \
Var direkt och pedagogisk. Inga emojis. Inga onödiga fraser som "Bra fråga!". \
Användaren håller just på med: ${context.phaseName} (fas ${context.phase} av 4). \
Nuvarande drag: ${context.currentMove} (${context.explanation}).`
      : `You are a helpful Rubik's cube tutor. \
Always reply in English. Keep the answer short — max 3 sentences. \
Be direct and educational. No emojis. No filler phrases like "Great question!". \
The user is currently on: ${context.phaseName} (phase ${context.phase} of 4). \
Current move: ${context.currentMove} (${context.explanation}).`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ];

    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages,
      max_tokens: 200,
    });

    return new Response(JSON.stringify({ answer: (response as { response: string }).response }), {
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    });
  },
};
