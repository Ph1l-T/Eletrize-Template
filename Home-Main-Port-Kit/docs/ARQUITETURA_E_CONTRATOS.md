# Arquitetura e Contratos

## 1) DependÃªncias externas

- Open-Meteo:
  - `https://api.open-meteo.com/v1/forecast`
- Backend de automaÃ§Ã£o:
  - `GET /polling?devices=<ids>`
  - `GET /hubitat-proxy?device=<id>&command=<cmd>[&value=<value>]`

## 2) Contratos mÃ­nimos de dados

### 2.1 Weather config
```js
{
  city: "Ribeirao Preto",
  latitude: -21.1775,
  longitude: -47.8103,
  timezone: "auto",
  refreshMinutes: 15
}
```

### 2.2 Main dashboard config
```js
{
  nowPlayingDeviceId: "",
  controls: {
    transportDeviceId: "",
    audioDeviceId: "",
    commands: {
      play: "play",
      pause: "pause",
      next: "nextTrack",
      previous: "previousTrack",
      mute: "mute",
      unmute: "unmute"
    }
  },
  previewNowPlaying: {
    enabled: true,
    status: "playing",
    track: "Blinding Lights",
    artist: "The Weeknd",
    album: "After Hours",
    artwork: "images/Images/music-placeholder.png",
    muted: false
  }
}
```

### 2.3 Environments
Cada ambiente deve expor:
- `key`, `name`, `photo`
- listas opcionais por tipo: `lights`, `curtains`, `tv`, `htv`, `bluray`, `appletv`, `clarotv`, `music`, `roku`, `games`, `hidromassagem`
- `airConditioner` (`deviceId` e/ou `zones[].deviceId`)

## 3) Contrato de integraÃ§Ã£o (adapters)

O mÃ³dulo de Home deve receber/adaptar:
- `getStoredState(deviceId): string|null`
- `setStoredState(deviceId, state): void`
- `sendCommand(deviceId, command, value?): Promise<any>`
- `navigate(route): void`
- `getVisibleEnvironments(): Environment[]`
- `getEnvironmentPhotoMap(): Record<string,string>`

## 4) Regras de estado ativo

Estado inativo:
- `off`, `closed`, `closing`, `close`, `stopped`, `stop`, `idle`, `paused`, `pause`, `false`, `0`, `unknown`, `unavailable`, `none`, `null`.

Tudo fora disso Ã© considerado ativo.

## 5) Comandos de desligamento

- `curtains` => comando `close`, estado final `closed`
- demais => comando `off`, estado final `off`

## 6) PersistÃªncia de Ãºltimo ambiente

- chave: `lastEnvironmentRoute`
- valor esperado: `ambienteN`

## 7) Regras de confiabilidade

- NÃ£o cachear `/polling` no service worker (network-only).
- NÃ£o sobrescrever estado local com `off` quando estiver offline sem confirmaÃ§Ã£o real.
- Quando possÃ­vel, usar debounce de refresh para evitar flicker.


