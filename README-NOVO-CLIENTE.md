# Checklist Novo Cliente

Esta pasta e a base limpa do dashboard para novos clientes. Ela deve permanecer sem IDs reais, tokens, emails pessoais ou scripts especificos de clientes anteriores.

## Onde configurar o novo cliente

1. Edite `config.js`.
2. Atualize `clientInfo.name`, `projectName`, `location` e `version`.
3. Atualize `appInfo.logo` e `appInfo.links` se o cliente tiver logo, Instagram ou WhatsApp proprio.
4. Configure os ambientes em `CLIENT_CONFIG.environments`.
5. Para cada ambiente, preencha `lights`, `curtains`, `airConditioner`, `tv`, `music` e demais listas com os IDs reais do Hubitat.
6. Coloque as fotos do cliente em `images/Images/` e aponte o campo `photo` de cada ambiente para o arquivo correto.
7. Ajuste `weather.messages` caso o cliente queira frases proprias, datas comemorativas extras ou outro formato para dias da semana.
8. Ao terminar, copie somente a estrutura final limpa para o repositorio do cliente.

## Credenciais

Nao coloque tokens reais no frontend.

No Cloudflare Pages, configure:

- `HUBITAT_BASE_URL`
- `HUBITAT_ACCESS_TOKEN`
- `AUTH_ENABLED`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `ALLOWED_EMAILS` ou `ALLOWED_EMAIL_DOMAINS`

Por padrao, `auth.enabled` esta `false` no `config.js` para facilitar a montagem visual do novo cliente. Ative quando o projeto Supabase do cliente estiver pronto.

## Navbar

A navbar do template fica completa por padrao:

- `bottomNavConfig.behavior.autoHideOnScroll = false`
- `bottomNavConfig.behavior.controlHomeShortcut.enabled = false`

Se quiser voltar ao comportamento compacto em paginas de controle, reative essas opcoes em `config.js`.

## Supabase

As migrations em `sql/supabase/migrations/` criam as tabelas e policies. O seed de dispositivos foi removido de proposito. Depois de preencher os dispositivos do novo cliente, crie um script em `sql/supabase/scripts/` para popular `environment_device_registry`.

## Arquivos que devem continuar genericos no template

- `config.example.js`
- `.dev.vars.example`
- `sql/supabase/scripts/`
- `images/Images/photo-placeholder.webp`
- `README.md`

## Desenvolvimento local

```bash
npm install
npm run dev
```

O servidor local serve arquivos estaticos. As Cloudflare Functions (`/polling`, `/hubitat-proxy`) funcionam no deploy Cloudflare Pages ou em ambiente local que emule Pages Functions.
