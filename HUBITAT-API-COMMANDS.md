# Hubitat Cloud API - ReferÃªncia de Comandos

## Base URL

```
https://cloud.hubitat.com/api/SEU-HUBITAT-UUID/apps/APP_ID
```

## Access Token

```
access_token=SEU-HUBITAT-TOKEN
```

---

## Endpoints DisponÃ­veis

### 1. Get Device Info

ObtÃ©m informaÃ§Ãµes completas de um dispositivo.

**URL:**

```
GET /devices/[Device ID]?access_token=SEU-HUBITAT-TOKEN
```

**Exemplo:**

```
https://cloud.hubitat.com/api/SEU-HUBITAT-UUID/apps/APP_ID/devices/DEVICE_ID?access_token=SEU-HUBITAT-TOKEN
```

---

### 2. Get Device Event History

ObtÃ©m histÃ³rico de eventos de um dispositivo.

**URL:**

```
GET /devices/[Device ID]/events?access_token=SEU-HUBITAT-TOKEN
```

**Exemplo:**

```
https://cloud.hubitat.com/api/SEU-HUBITAT-UUID/apps/APP_ID/devices/DEVICE_ID/events?access_token=SEU-HUBITAT-TOKEN
```

---

### 3. Get Device Commands

Lista todos os comandos disponÃ­veis para um dispositivo.

**URL:**

```
GET /devices/[Device ID]/commands?access_token=SEU-HUBITAT-TOKEN
```

**Exemplo:**

```
https://cloud.hubitat.com/api/SEU-HUBITAT-UUID/apps/APP_ID/devices/DEVICE_ID/commands?access_token=SEU-HUBITAT-TOKEN
```

---

### 4. Get Device Capabilities

Lista todas as capabilities de um dispositivo.

**URL:**

```
GET /devices/[Device ID]/capabilities?access_token=SEU-HUBITAT-TOKEN
```

**Exemplo:**

```
https://cloud.hubitat.com/api/SEU-HUBITAT-UUID/apps/APP_ID/devices/DEVICE_ID/capabilities?access_token=SEU-HUBITAT-TOKEN
```

---

### 5. Get Device Attribute

ObtÃ©m o valor de um atributo especÃ­fico.

**URL:**

```
GET /devices/[Device ID]/attribute/[Attribute]?access_token=SEU-HUBITAT-TOKEN
```

**Exemplo:**

```
https://cloud.hubitat.com/api/SEU-HUBITAT-UUID/apps/APP_ID/devices/DEVICE_ID/attribute/volume?access_token=SEU-HUBITAT-TOKEN
```

---

### 6. Send Device Command â­ **IMPORTANTE**

Envia um comando para um dispositivo.

**URL:**

```
GET /devices/[Device ID]/[Command]/[Secondary value]?access_token=SEU-HUBITAT-TOKEN
```

**Estrutura:**

- `[Device ID]` - ID do dispositivo (ex: 111)
- `[Command]` - Nome do comando (ex: pushButton)
- `[Secondary value]` - Valor secundÃ¡rio/parÃ¢metro (ex: 25) - **OPCIONAL**

**Exemplos:**

#### Comando sem parÃ¢metro:

```
https://cloud.hubitat.com/api/SEU-HUBITAT-UUID/apps/APP_ID/devices/DEVICE_ID/on?access_token=SEU-HUBITAT-TOKEN
```

#### Comando com parÃ¢metro (pushButton):

```
https://cloud.hubitat.com/api/SEU-HUBITAT-UUID/apps/APP_ID/devices/DEVICE_ID/pushButton/25?access_token=SEU-HUBITAT-TOKEN
```

#### Comando setVolume:

```
https://cloud.hubitat.com/api/SEU-HUBITAT-UUID/apps/APP_ID/devices/DEVICE_ID/setVolume/50?access_token=SEU-HUBITAT-TOKEN
```

---

### 7. Send POST URL

Envia um POST para uma URL codificada.

**URL:**

```
GET /postURL/[URL]?access_token=SEU-HUBITAT-TOKEN
```

---

### 8. Set Hub Variable

Define o valor de uma variÃ¡vel do hub.

**URL:**

```
GET /hubvariables/[Variable Name]/[Value]?access_token=SEU-HUBITAT-TOKEN
```

---

### 9. Get Modes List

Lista todos os modos disponÃ­veis.

**URL:**

```
GET /modes?access_token=SEU-HUBITAT-TOKEN
```

**Exemplo:**

```
https://cloud.hubitat.com/api/SEU-HUBITAT-UUID/apps/APP_ID/modes?access_token=SEU-HUBITAT-TOKEN
```

---

### 10. Set Mode

Define um modo especÃ­fico.

**URL:**

```
GET /modes/[Mode ID]?access_token=SEU-HUBITAT-TOKEN
```

---

## ðŸ“º Comandos do Controle de TV (Device DEVICE_ID)

### Formato Correto para Device DEVICE_ID

O device DEVICE_ID expÃµe comandos individuais para cada aÃ§Ã£o do controle.

**Template:**

```
/devices/DEVICE_ID/[Comando]?access_token=...
```

### Mapeamento de BotÃµes TV:

| BotÃ£o         | Comando        | URL Completa                                 |
| ------------- | -------------- | -------------------------------------------- |
| ON            | `on`           | `/devices/DEVICE_ID/on?access_token=...`           |
| OFF           | `off`          | `/devices/DEVICE_ID/off?access_token=...`          |
| UP            | `cursorUp`     | `/devices/DEVICE_ID/cursorUp?access_token=...`     |
| DOWN          | `cursorDown`   | `/devices/DEVICE_ID/cursorDown?access_token=...`   |
| LEFT          | `cursorLeft`   | `/devices/DEVICE_ID/cursorLeft?access_token=...`   |
| RIGHT         | `cursorRight`  | `/devices/DEVICE_ID/cursorRight?access_token=...`  |
| OK            | `cursorCenter` | `/devices/DEVICE_ID/cursorCenter?access_token=...` |
| BACK          | `returnButton` | `/devices/DEVICE_ID/returnButton?access_token=...` |
| MENU (HDMI 2) | `hdmi2`        | `/devices/DEVICE_ID/hdmi2?access_token=...`        |
| HOME          | `home`         | `/devices/DEVICE_ID/home?access_token=...`         |
| MUTE          | `mute`         | `/devices/DEVICE_ID/mute?access_token=...`         |
| CH+           | `channelDown`  | `/devices/DEVICE_ID/channelDown?access_token=...`  |
| CH-           | `channelUp`    | `/devices/DEVICE_ID/channelUp?access_token=...`    |
| NÃºmero 0      | `num0`         | `/devices/DEVICE_ID/num0?access_token=...`         |
| NÃºmero 1      | `num1`         | `/devices/DEVICE_ID/num1?access_token=...`         |
| NÃºmero 2      | `num2`         | `/devices/DEVICE_ID/num2?access_token=...`         |
| NÃºmero 3      | `num3`         | `/devices/DEVICE_ID/num3?access_token=...`         |
| NÃºmero 4      | `num4`         | `/devices/DEVICE_ID/num4?access_token=...`         |
| NÃºmero 5      | `num5`         | `/devices/DEVICE_ID/num5?access_token=...`         |
| NÃºmero 6      | `num6`         | `/devices/DEVICE_ID/num6?access_token=...`         |
| NÃºmero 7      | `num7`         | `/devices/DEVICE_ID/num7?access_token=...`         |
| NÃºmero 8      | `num8`         | `/devices/DEVICE_ID/num8?access_token=...`         |
| NÃºmero 9      | `num9`         | `/devices/DEVICE_ID/num9?access_token=...`         |

---

## ðŸŽµ Comandos do Denon (Device 15)

### Volume:

```
/devices/DEVICE_ID/setVolume/[0-100]?access_token=...
```

### Outros comandos:

- `/devices/DEVICE_ID/mute?access_token=...`
- `/devices/DEVICE_ID/unmute?access_token=...`
- `/devices/DEVICE_ID/play?access_token=...`
- `/devices/DEVICE_ID/pause?access_token=...`
- `/devices/DEVICE_ID/nextTrack?access_token=...`
- `/devices/DEVICE_ID/previousTrack?access_token=...`

---

## Notas Importantes

1. **MÃ©todo HTTP:** Todos os comandos usam GET (nÃ£o POST)
2. **URL Encoding:** EspaÃ§os e caracteres especiais devem ser codificados
3. **Access Token:** Sempre incluir no query string
4. **pushButton:** Comando usado para dispositivos de controle remoto virtual
5. **Secondary Value:** ParÃ¢metro adicional usado em comandos como pushButton e setVolume



