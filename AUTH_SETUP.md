# Setup de Login (Email/Senha + Google)

Este projeto agora possui login com Supabase no frontend e validacao de token nas Cloudflare Functions.

## 1) Criar projeto no Supabase

1. Crie um projeto em https://supabase.com.
2. Em `Authentication > Providers`:
   - habilite `Email` (email/senha)
   - habilite `Google`
3. Em `Authentication > URL Configuration`:
   - adicione seu dominio de producao e localhost como redirect URL

## 2) Configurar frontend (`config.js`)

Edite o bloco `auth`:

```js
auth: {
  enabled: true,
  supabaseUrl: "https://SEU-PROJETO.supabase.co",
  supabaseAnonKey: "SUA_ANON_KEY",
  allowEmailSignUp: false,
  allowGoogleLogin: true,
  requireEmailConfirmation: true,
  redirectTo: "https://seu-dominio.com/"
}
```

Notas:
- `allowEmailSignUp: false` deixa o cadastro fechado no app (recomendado para casa/empresa).
- `redirectTo` deve apontar para a URL publica do dashboard.

## 3) Configurar backend (Cloudflare Pages)

Em `Pages > Seu projeto > Settings > Variables and Secrets`, crie:

Obrigatorias para auth:
- `AUTH_ENABLED=true`
- `SUPABASE_URL=https://SEU-PROJETO.supabase.co`
- `SUPABASE_ANON_KEY=...`

Allowlist (recomendado):
- `ALLOWED_EMAILS=voce@email.com,familia@email.com`
- opcional: `ALLOWED_EMAIL_DOMAINS=empresa.com`

Email verificado:
- `REQUIRE_EMAIL_VERIFIED=true`

Hubitat (recomendado mover para secret):
- `HUBITAT_BASE_URL=...`
- `HUBITAT_ACCESS_TOKEN=...`

## 4) Como permitir emails diferentes com seguranca

Voce nao coloca lista de emails no frontend.

Opcoes seguras:
1. Lista fechada por secret: altere `ALLOWED_EMAILS` no Cloudflare.
2. Por dominio: use `ALLOWED_EMAIL_DOMAINS`.
3. Sem restricao: deixe ambos vazios (qualquer conta autenticada entra).

## 5) Fluxo de uso

1. Abra o app: aparece tela de login.
2. Entre com email/senha ou Google.
3. Frontend recebe token e envia automaticamente no header `Authorization` para `/polling` e `/hubitat-proxy`.
4. Functions validam token e email allowlist antes de acessar Hubitat.

## 6) Teste rapido

1. Tente abrir app sem login -> deve bloquear.
2. Login com email fora da allowlist -> deve receber 403.
3. Login com email permitido -> comandos e polling funcionam.
4. Abra `.../polling?health=1` sem login -> responde `ok` (somente health check).

## 7) Logout

No console do navegador:

```js
window.dashboardAuth.signOut()
```

Isso encerra a sessao e recarrega o app bloqueado novamente.

