// OAuth2 com a Google para ligar a conta de envio (Gmail) num clique.
// As credenciais da aplicação (Client ID/Secret) vêm de variáveis de ambiente,
// definidas uma única vez pelo responsável. O refresh token da conta ligada
// é guardado no volume de dados (definicoes.json).

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';

// Envio de email a partir da conta ligada + identificação da conta
const SCOPES = ['openid', 'email', 'https://www.googleapis.com/auth/gmail.send'];

// A aplicação OAuth está configurada no servidor?
export function oauthConfigurado(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

// URI de redireccionamento (tem de estar registada na consola Google Cloud)
export function redirectUri(origin: string): string {
  return `${origin}/admin/oauth/google/callback`;
}

// URL de consentimento da Google para onde o administrador é enviado
export function urlAutorizacao(origin: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? '',
    redirect_uri: redirectUri(origin),
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

// Descodifica o payload de um id_token (JWT) sem verificar assinatura — o token
// vem diretamente da Google por TLS, por isso é seguro ler o email daqui.
function emailDoIdToken(idToken?: string): string | undefined {
  if (!idToken) return undefined;
  const partes = idToken.split('.');
  if (partes.length < 2) return undefined;
  try {
    const payload = JSON.parse(Buffer.from(partes[1], 'base64url').toString('utf8'));
    return typeof payload.email === 'string' ? payload.email : undefined;
  } catch {
    return undefined;
  }
}

export interface ResultadoToken {
  refreshToken?: string;
  email?: string;
}

// Troca o código de autorização por tokens e devolve o refresh token + email
export async function trocarCodigo(origin: string, code: string): Promise<ResultadoToken> {
  const corpo = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID ?? '',
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    redirect_uri: redirectUri(origin),
    grant_type: 'authorization_code',
  });

  const resposta = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: corpo.toString(),
    signal: AbortSignal.timeout(10000),
  });

  if (!resposta.ok) {
    throw new Error(`Troca de código falhou: ${resposta.status}`);
  }

  const dados = await resposta.json();
  return {
    refreshToken: dados.refresh_token,
    email: emailDoIdToken(dados.id_token),
  };
}

// Revoga o refresh token na Google (melhor esforço, ao desligar a conta)
export async function revogar(refreshToken: string): Promise<void> {
  try {
    await fetch(`${REVOKE_URL}?token=${encodeURIComponent(refreshToken)}`, {
      method: 'POST',
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // sem rede, timeout ou token já inválido: ignorado
  }
}
