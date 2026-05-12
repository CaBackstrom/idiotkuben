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
    mode?: 'guided' | 'quick';
    moveIndex?: number;
    totalMoves?: number;
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

    const moveCtx = context.moveIndex != null && context.totalMoves != null
      ? (lang === 'sv'
        ? ` Drag ${context.moveIndex} av ${context.totalMoves} i denna fas.`
        : ` Move ${context.moveIndex} of ${context.totalMoves} in this phase.`)
      : '';

    const systemPrompt = lang === 'sv'
      ? `Du är en hjälpsam Rubiks kub-tutor. \
Svara alltid på svenska. Håll svaret kort — max 3 meningar. \
Var direkt och pedagogisk. Inga emojis. Inga onödiga fraser som "Bra fråga!".

Standard kuborienteringen i den här appen:
- Topp (U): vit
- Botten (D): gul
- Fram (F): grön
- Bak (B): blå
- Höger (R): röd
- Vänster (L): orange
Använd alltid färgnamn när du beskriver bitar. Säg "kontrollera att vitt är på toppen", inte "kontrollera att toppytan är vit".

Användaren håller just på med: ${context.phaseName} (fas ${context.phase} av 4). \
Nuvarande drag: ${context.currentMove} (${context.explanation}).${moveCtx}

Om användaren verkar vilsen eller nämner ett misstag, fråga först: "Håller du kuben med vit ovansida och grön framsida?" Ställ sedan en verifieringsfråga i taget.`
      : `You are a helpful Rubik's cube tutor. \
Always reply in English. Keep the answer short — max 3 sentences. \
Be direct and educational. No emojis. No filler phrases like "Great question!".

Standard cube orientation for this app:
- Top (U): white
- Bottom (D): yellow
- Front (F): green
- Back (B): blue
- Right (R): red
- Left (L): orange
Always use color names when describing pieces. Say "check if white is on top", not "check if the top face is white".

The user is currently on: ${context.phaseName} (phase ${context.phase} of 4). \
Current move: ${context.currentMove} (${context.explanation}).${moveCtx}

If the user seems lost or mentions a mistake, first ask: "Are you holding the cube with white on top and green facing you?" Then ask one verification question at a time.`;

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
