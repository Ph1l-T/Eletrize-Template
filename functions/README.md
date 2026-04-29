# Cloudflare Pages Functions

Este projeto usa Cloudflare Functions para proxy da Maker API do Hubitat.

## Endpoints

### `/hubitat-proxy`

Proxy para comandos individuais.

- Parametros: `?device=ID&command=CMD&value=VAL`
- Exemplo: `/hubitat-proxy?device=76&command=on`

### `/polling`

Busca estados de multiplos dispositivos.

- Parametros: `?devices=1,2,3`
- Exemplo: `/polling?devices=76,20,58`
- Health check publico: `/polling?health=1`

## Autenticacao

Quando habilitada, as Functions protegidas exigem header:

`Authorization: Bearer <SUPABASE_ACCESS_TOKEN>`

A validacao do token e feita contra o endpoint `/auth/v1/user` do Supabase.

## Variaveis de ambiente (Cloudflare Pages > Settings > Variables and Secrets)

Obrigatorias para auth:

- `AUTH_ENABLED=true`
- `SUPABASE_URL=https://SEU-PROJETO.supabase.co`
- `SUPABASE_ANON_KEY=...`

Allowlist de emails (opcional, recomendado):

- `ALLOWED_EMAILS=email1@dominio.com,email2@dominio.com`
- `ALLOWED_EMAIL_DOMAINS=dominio.com,empresa.com`

Controle de verificacao de email (opcional):

- `REQUIRE_EMAIL_VERIFIED=true`

Credenciais Hubitat (opcional, recomendado mover para secret):

- `HUBITAT_BASE_URL=...`
- `HUBITAT_ACCESS_TOKEN=...`

## Observacoes

- Se `AUTH_ENABLED` nao estiver definido, a auth e ativada automaticamente quando `SUPABASE_URL` e `SUPABASE_ANON_KEY` estiverem preenchidos.
- Se nao houver allowlist (`ALLOWED_EMAILS`/`ALLOWED_EMAIL_DOMAINS`), qualquer usuario autenticado entra.
