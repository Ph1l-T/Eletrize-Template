# Prompt Técnico - Portar Home Main (1:1)

Implemente uma página inicial `Main` com fidelidade funcional e visual ao Dashboard Eletrize.

## Escopo obrigatório

A tela `Main` deve conter, nesta ordem:
1. Widget de clima fixo no topo (`spa-home-widget` / `spa-weather-chip`).
2. Card `Now Playing` (`main-now-playing-card`).
3. Card `Último Ambiente` (`main-last-room-card`).
4. Card `Dispositivos Ligados` (`main-active-devices-card`).

## Estrutura DOM obrigatória (IDs/classes)

Use exatamente os IDs abaixo para garantir integração com o runtime:
- Clima:
  - `#spa-home-widget`
  - `#spa-weather-chip`
  - `#spa-weather-greeting`
  - `#spa-weather-icon`
  - `#spa-weather-value`
- Now Playing:
  - `#main-now-playing-card`
  - `#main-now-playing-state`
  - `#main-now-playing-art`
  - `#main-now-playing-track`
  - `#main-now-playing-artist`
  - `#main-now-playing-album`
  - `#main-now-playing-controls`
  - `#main-now-playing-play-btn`
  - `#main-now-playing-play-icon`
  - `#main-now-playing-mute-btn`
  - `#main-now-playing-mute-icon`
- Dispositivos ativos:
  - `#main-active-devices-card`
  - `#main-active-devices-off-btn`
  - `#main-active-devices-list`

Classes obrigatórias:
- `.main-dashboard-page`
- `.main-dashboard-panel`
- `.main-dashboard-layout`
- `.main-panel-card`
- `.main-now-playing-content`
- `.main-now-playing-controls`
- `.main-now-playing-btn`
- `.main-last-room-card`
- `.main-active-devices-card`
- `.main-active-devices-list`
- `.spa-weather-chip`
- `.spa-weather-greeting`
- `.spa-weather-right`
- `.spa-weather-icon`
- `.spa-weather-value`

## Contrato de configuração

A implementação deve depender destes objetos/funções de configuração:
- `getWeatherConfig()` -> `{ city, latitude, longitude, timezone, refreshMinutes }`
- `getMainDashboardConfig()` -> `{ nowPlayingDeviceId, controls, previewNowPlaying }`
- `getVisibleEnvironments()` -> lista de ambientes ativos
- `getEnvironmentPhotoMap()` -> mapa `envKey -> imagePath`

`mainDashboard.controls.commands` obrigatório:
- `play`, `pause`, `next`, `previous`, `mute`, `unmute`

## Comportamento de clima (Open-Meteo)

Endpoint:
- `https://api.open-meteo.com/v1/forecast`

Query:
- `latitude`
- `longitude`
- `timezone`
- `current=temperature_2m,weather_code,is_day`
- `forecast_days=1`

Regras:
- Exibir apenas: saudação + ícone + temperatura.
- Temperatura: inteiro arredondado, formato `NN°C`.
- Atualização periódica: `refreshMinutes` (mínimo 1 min).
- Cache em memória para evitar requisições excessivas.
- Em falha: ícone unknown + `--°C`.

## Regras de saudação

Faixas:
- madrugada: 00:00–04:59
- dia: 05:00–11:59
- tarde: 12:00–17:59
- noite: 18:00–23:59

Obrigatório:
- Ter variações por horário e por grupo climático.
- Frases com exclamação.

## Mapeamento weather_code -> ícone

- `0` -> clear day/night
- `1,2` -> partly cloudy day/night
- `3` -> cloudy
- `45,48` -> fog
- `51..67`, `80..82`, `85,86` -> drizzle (garoa/chuva no mesmo ícone)
- `95,96,99` -> thunderstorm
- `71..77` -> cloudy
- fallback -> unknown

## Now Playing

Estado e comportamento:
- Badge com estados: `Tocando`, `Pausado`, `Mutado`, `Inativo`, `Offline`.
- Controles visíveis apenas quando status `playing`/`paused`.
- Botões:
  - anterior (`previous`)
  - play/pause (`playPause`)
  - próxima (`next`)
  - mute toggle (`muteToggle`)
- Botões sem aparência de "pill destacada", apenas ícone.
- Mesmo tamanho entre botões.
- Dimensão de ícones otimizada para mobile.

Modo preview:
- Quando `previewNowPlaying.enabled=true`, usar dados fictícios sem polling.

Modo live:
- Consultar `/polling?devices=<nowPlayingDeviceId>`.
- Ler atributos de track/artist/album/status/mute/albumArt.

## Último ambiente

Persistência:
- `localStorage["lastEnvironmentRoute"] = "ambienteN"`

Regra:
- Mostrar último ambiente válido acessado.
- Se inexistente/inválido, usar o primeiro ambiente visível.
- Card clicável para navegar.

## Dispositivos ligados

Fonte:
- Derivar de cada ambiente visível com tipos:
  - `lights`, `curtains`, `comfort`, `tv`, `htv`, `bluray`, `appletv`, `clarotv`, `music`, `roku`, `games`, `hidromassagem`.

Estado ativo:
- Considere inativo se estado for:
  - `off, closed, closing, close, stopped, stop, idle, paused, pause, false, 0, unknown, unavailable, none, null`

Render:
- Agrupar por ambiente.
- Cada item: ícone + nome + botão `Desligar`.
- Botão global `Desligar todos`.
- Comando OFF:
  - `curtains` -> `close`
  - demais -> `off`

## Layout e UX

- Tema dark + glassmorphism.
- Cards ocupam largura total do container.
- Gap vertical curto e consistente.
- Card de dispositivos deve preencher altura restante e respeitar margem de 20px até a navbar.
- Se exceder conteúdo: rolagem interna no card.
- Evitar texto bold excessivo.
- Navbar deve manter indicador de item ativo.

## Offline e polling (obrigatório)

- Não usar resposta stale de polling cacheada.
- Se houver service worker, tratar `/polling` como network-only (sem cache).
- Em offline, manter último estado local conhecido e não forçar OFF.

## Critérios de aceite

Aceitar apenas se:
- Ordem dos blocos igual ao escopo.
- Clima atualizado conforme config + saudação dinâmica.
- Now Playing com preview e live.
- Último ambiente navegável.
- Dispositivos ligados agrupados e desligamento individual/global funcionando.
- Responsivo mobile sem quebra de layout.

