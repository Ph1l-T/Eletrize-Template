# Dashboard Eletrize - Template de Cliente

Base limpa para criar dashboards de automacao residencial/comercial para novos clientes. O objetivo do template e concentrar a personalizacao em poucos pontos, sem carregar dados, IDs ou credenciais de clientes anteriores.

## Fluxo recomendado

1. Duplique esta pasta para o nome do novo projeto.
2. Edite `package.json`, `manifest.json` e `service-worker.js` com o nome/versionamento do novo cliente.
3. Configure o cliente em `config.js`.
4. Adicione fotos dos ambientes em `images/Images/`.
5. Configure Hubitat e Supabase no Cloudflare Pages usando secrets/variables.
6. Rode as migrations em `sql/supabase/migrations/`.
7. Teste localmente com `npm run dev`.

## Arquivo principal

A maior parte do setup fica em `config.js`:

- `clientInfo`: nome, projeto, local e versao exibida no app.
- `appInfo`: logo e links do menu rapido, incluindo Instagram e suporte.
- `auth`: chaves publicas do Supabase no frontend, se o login estiver ativo.
- `makerApi`: somente para testes locais conscientes; em producao use Cloudflare secrets.
- `ui`: labels, icones e overrides globais.
- `environments`: ambientes, fotos, luzes, cortinas, AC, TVs, musica e controles especiais.
- `devices`: defaults de audio, marcas de AC, controles legados e dispositivos extras de polling.
- `weather.messages`: frases do clima, dias da semana e datas comemorativas.
- `bottomNavConfig`: exibicao e comportamento da navbar.

O `config.example.js` deve acompanhar o `config.js` limpo. Ao criar um cliente novo, mantenha o `config.example.js` sem dados reais.

## Ambientes

Cada ambiente usa uma chave fixa, por exemplo `ambiente1`, `ambiente2`, etc. Para exibir na navbar/lista de ambientes:

```js
ambiente1: {
  visible: true,
  order: 1,
  name: "Sala",
  photo: "photo-sala.webp",
  lights: [{ id: "101", name: "Lustre" }],
  curtains: [{ id: "201", name: "Cortina" }],
  airConditioner: null,
}
```

As fotos devem ficar em `images/Images/` e o campo `photo` deve apontar para o nome do arquivo.

## Credenciais

Nao coloque token real do Hubitat no frontend. Em producao, configure no Cloudflare Pages:

- `HUBITAT_BASE_URL`
- `HUBITAT_ACCESS_TOKEN`
- `RULE_ENGINE_BASE_URL`
- `RULE_ENGINE_ACCESS_TOKEN`
- `AUTH_ENABLED`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `ALLOWED_EMAILS` ou `ALLOWED_EMAIL_DOMAINS`

Use `.dev.vars.example` como referencia de variaveis. O arquivo real `.dev.vars` deve ficar fora do controle de versao.

Para rotinas, `RULE_ENGINE_BASE_URL` precisa ser alcancavel pelo ambiente que executa a Function. Se a URL do app Hubitat for local (`http://HUB_IP/...`) e o dashboard estiver publicado no Cloudflare Pages, exponha esse endpoint por uma rede segura/tunnel ou execute a ponte em um ambiente dentro da rede local.

## Datas festivas no clima

As mensagens normais do clima ficam curtas para caber no modo retrato. Para datas especiais, configure mensagens em `config.js`, dentro de `weather.messages.festiveDates`:

```js
weather: {
  messages: {
    includeWeekday: false,
    weekdayFormat: "{message}",
    festiveDates: {
      "12-25": ["Feliz Natal!", "Um Natal muito especial!"],
      "01-01": ["Feliz Ano Novo!"],
      "10-12": ["Feliz Dia das Criancas!"],
    },
  },
}
```

Variaveis ainda ficam disponiveis caso algum cliente precise de uma frase personalizada:

- `{message}`: mensagem de clima escolhida automaticamente.
- `{weekday}`: dia da semana por extenso.
- `{weekdayShort}`: dia da semana abreviado.
- `{date}`: data no formato `DD/MM`.
- `{day}` e `{month}`: dia e mes com dois digitos.
- `{period}`: `madrugada`, `dia`, `tarde` ou `noite`.
- `{weatherGroup}`: grupo de clima, como `clear`, `rainy` ou `cloudy`.

Datas comemorativas fixas usam a chave `MM-DD`. Datas moveis, como Carnaval e Pascoa, devem ser adicionadas manualmente no projeto do cliente para o ano desejado.

## Supabase

As migrations ficam em `sql/supabase/migrations/`.

Depois de preencher os ambientes/dispositivos do novo cliente, crie um script de seed em `sql/supabase/scripts/` para popular `environment_device_registry`. Essa pasta deve comecar vazia no template.

## Navbar

O template fica com a navbar completa por padrao:

```js
bottomNavConfig.behavior.autoHideOnScroll = false;
bottomNavConfig.behavior.controlHomeShortcut.enabled = false;
```

Reative essas opcoes apenas se o cliente precisar do modo compacto em paginas de controle.

## Desenvolvimento

```bash
npm install
npm run dev
```

O servidor local serve o frontend estatico. As rotas `/polling`, `/hubitat-proxy` e `/session-bootstrap` sao Cloudflare Pages Functions e dependem do ambiente Cloudflare ou de uma emulacao compativel.

## Checklist rapido

Use `README-NOVO-CLIENTE.md` para o passo a passo operacional de implantacao de cada cliente.
