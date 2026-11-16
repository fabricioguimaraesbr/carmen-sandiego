// Cloudflare Worker: serve o jogo (arquivos estáticos de public/) e a API de salvamento.
// O servidor nunca vê a senha nem o progresso: guarda só um blob CIFRADO no KV
// e confere o SHA-256 do token de acesso contra o segredo SAVE_AUTH_HASH.
//
// GET  /api/status                  -> { configured, kv, secret } (diz o que falta, sem expor valores)
// GET  /api/save                    -> 200 { rev, blob } | 204 (vazio)
// PUT  /api/save { baseRev, blob }  -> 200 { rev } | 409 { rev, blob } (outro aparelho salvou antes)

export interface Env {
  ASSETS: Fetcher;
  SAVE?: KVNamespace;
  SAVE_AUTH_HASH?: string;
}

interface Blob {
  v: 1;
  iv: string;
  ct: string;
}

interface Stored {
  rev: number;
  blob: Blob;
  savedAt: number;
}

const KEY = 'save';
const MAX_BYTES = 1024 * 1024;
// O jogo salva a cada ação; para poupar a cota de escrita do KV, guarda um backup a cada N versões.
const BACKUP_EVERY = 25;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

function setupState(env: Env) {
  const kv = !!env.SAVE;
  const secret = !!env.SAVE_AUTH_HASH?.trim();
  return { configured: kv && secret, kv, secret };
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function authorize(request: Request, env: Env): Promise<Response | null> {
  const expected = env.SAVE_AUTH_HASH?.trim().toLowerCase();
  if (!expected || !env.SAVE) return json({ error: 'not_configured', ...setupState(env) }, 503);
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!/^[0-9a-f]{64}$/.test(token) || !safeEqual(await sha256Hex(token), expected)) {
    return json({ error: 'unauthorized' }, 401);
  }
  return null;
}

async function getSave(request: Request, env: Env): Promise<Response> {
  const denied = await authorize(request, env);
  if (denied) return denied;
  const stored = await env.SAVE!.get<Stored>(KEY, 'json');
  if (!stored) return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  return json({ rev: stored.rev, blob: stored.blob });
}

async function putSave(request: Request, env: Env): Promise<Response> {
  const denied = await authorize(request, env);
  if (denied) return denied;

  const raw = await request.text();
  if (raw.length > MAX_BYTES) return json({ error: 'too_large' }, 413);
  let body: { baseRev?: unknown; blob?: Blob };
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  const { baseRev, blob } = body;
  if (typeof baseRev !== 'number' || !blob || blob.v !== 1 || typeof blob.iv !== 'string' || typeof blob.ct !== 'string') {
    return json({ error: 'invalid_body' }, 400);
  }

  const kv = env.SAVE!;
  const current = await kv.get<Stored>(KEY, 'json');
  const currentRev = current?.rev ?? 0;
  if (baseRev !== currentRev) return json({ rev: currentRev, blob: current?.blob }, 409);

  const next: Stored = { rev: currentRev + 1, blob, savedAt: Date.now() };
  await kv.put(KEY, JSON.stringify(next));
  if (current && current.rev % BACKUP_EVERY === 0) {
    await kv.put(`backup:${current.rev}`, JSON.stringify(current), { expirationTtl: 60 * 60 * 24 * 30 });
  }
  return json({ rev: next.rev });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === '/api/status' && request.method === 'GET') return json(setupState(env));
    if (pathname === '/api/save') {
      if (request.method === 'GET') return getSave(request, env);
      if (request.method === 'PUT') return putSave(request, env);
      return json({ error: 'method_not_allowed' }, 405);
    }
    if (pathname.startsWith('/api/')) return json({ error: 'not_found' }, 404);

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
