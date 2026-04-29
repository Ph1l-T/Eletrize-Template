# Como os Comandos de Luz Funcionam

## ðŸ“Š Fluxo Geral

```
Clique do UsuÃ¡rio
    â†“
toggleRoomControl() [script.js:345]
    â†“
sendHubitatCommand(deviceId, "on" ou "off", [opcional: value])
    â†“
Hubitat Proxy (functions/hubitat-proxy.js)
    â†“
Hubitat Cloud API
    â†“
Dispositivo Recebe Comando
```

---

## 1ï¸âƒ£ ETAPA 1: Clique do UsuÃ¡rio (HTML)

### Exemplo de um Card de Luz:

```html
<div
  class="control-card"
  data-state="off"
  data-device-id="238"
  onclick="toggleRoomControl(this)"
>
  <img
    class="control-icon"
    src="images/icons/icon-small-light-off.svg"
    alt="Spots Hall"
  />
  <div class="control-label">Spots Hall</div>
</div>
```

**Dados Importantes:**

- `data-device-id="238"` - ID do dispositivo
- `onclick="toggleRoomControl(this)"` - FunÃ§Ã£o chamada ao clicar

---

## 2ï¸âƒ£ ETAPA 2: FunÃ§Ã£o toggleRoomControl() (script.js:345)

```javascript
function toggleRoomControl(el) {
  const deviceId = el.dataset.deviceId; // Extrai ID do card (ex: "238")
  const isOff = (el.dataset.state || "off") === "off";
  const newState = isOff ? "on" : "off"; // Alterna estado

  // Determina o comando:
  // - Se estÃ¡ OFF e clica â†’ newState = "on" â†’ comando = "on"
  // - Se estÃ¡ ON e clica â†’ newState = "off" â†’ comando = "off"

  console.log(`Enviando comando ${newState} para dispositivo ${deviceId}`);

  // Chama a funÃ§Ã£o que envia o comando
  sendHubitatCommand(deviceId, newState === "on" ? "on" : "off");
}
```

**Resumo:**

1. Extrai o `deviceId` do elemento clicado
2. Determina o novo estado (on/off)
3. Chama `sendHubitatCommand(deviceId, comando)`

---

## 3ï¸âƒ£ ETAPA 3: FunÃ§Ã£o sendHubitatCommand() (script.js:2425)

```javascript
async function sendHubitatCommand(deviceId, command, value) {
  // ParÃ¢metros:
  // - deviceId: ID do dispositivo (ex: "238")
  // - command: comando a executar (ex: "on" ou "off")
  // - value: parÃ¢metro opcional (ex: "50" para volume)

  // ConstrÃ³i a URL do proxy:
  const proxyUrl = `${HUBITAT_PROXY_URL}?device=${deviceId}&command=${encodeURIComponent(
    command
  )}${value !== undefined ? `&value=${encodeURIComponent(value)}` : ""}`;

  // Exemplos de URLs geradas:
  // - /hubitat-proxy?device=DEVICE_ID&command=on
  // - /hubitat-proxy?device=DEVICE_ID&command=off
  // - /hubitat-proxy?device=DEVICE_ID&command=setVolume&value=50
  // - /hubitat-proxy?device=DEVICE_ID&command=cursorUp

  // Faz o fetch da URL
  const response = await fetch(proxyUrl);
  return JSON.parse(response.text());
}
```

**ParÃ¢metros de sendHubitatCommand:**
| ParÃ¢metro | ObrigatÃ³rio | Exemplo | DescriÃ§Ã£o |
|-----------|------------|---------|-----------|
| deviceId | âœ… Sim | "238" | ID do dispositivo no Hubitat |
| command | âœ… Sim | "on" | Nome do comando |
| value | âŒ NÃ£o | "50" | Valor secundÃ¡rio (volume, nÃºmero botÃ£o, etc) |

---

## 4ï¸âƒ£ ETAPA 4: Hubitat Proxy (functions/hubitat-proxy.js)

```javascript
// Recebe os parÃ¢metros da URL:
const device = url.searchParams.get("device"); // "238"
const command = url.searchParams.get("command"); // "on"
const value = url.searchParams.get("value"); // null (para on/off)

// Monta a URL final da API do Hubitat:
let cmdUrl = `${HUBITAT_BASE_URL}/devices/${device}/${encodeURIComponent(
  command
)}`;

if (value) cmdUrl += `/${encodeURIComponent(value)}`;
cmdUrl += `?access_token=${HUBITAT_ACCESS_TOKEN}`;

// Exemplos finais gerados:
// Para luz ON:
//   https://cloud.hubitat.com/api/.../devices/DEVICE_ID/on?access_token=...
//
// Para luz OFF:
//   https://cloud.hubitat.com/api/.../devices/DEVICE_ID/off?access_token=...
//
// Para TV (cursorUp):
//   https://cloud.hubitat.com/api/.../devices/DEVICE_ID/cursorUp?access_token=...
```

---

## ðŸ“‹ Resumo: Ordem dos ParÃ¢metros

### Para Luzes (on/off):

```
deviceId â†’ comando
238 â†’ "on"
238 â†’ "off"
```

### Para Outros Dispositivos:

```
deviceId â†’ comando â†’ [valor opcional]
111 â†’ "cursorUp"
15 â†’ "setVolume" â†’ "50"
```

---

## ðŸ”„ Exemplo Completo: Acender a Luz "Spots Hall" (ID 238)

### 1. HTML Clicado:

```html
<div onclick="toggleRoomControl(this)" data-device-id="238" data-state="off">
  Spots Hall
</div>
```

### 2. JavaScript Executa:

```javascript
toggleRoomControl(element)
  â†’ deviceId = "238"
  â†’ newState = "on"
  â†’ sendHubitatCommand("DEVICE_ID", "on")
```

### 3. URL Enviada para Proxy:

```
/hubitat-proxy?device=DEVICE_ID&command=on
```

### 4. Proxy Monta URL Final:

```
https://cloud.hubitat.com/api/SEU-HUBITAT-UUID/apps/APP_ID/devices/DEVICE_ID/on?access_token=SEU-HUBITAT-TOKEN
```

### 5. Hubitat Recebe e Executa:

```
Acender o dispositivo 238 (Spots Hall)
```

---

## ðŸ“ ConclusÃ£o

**Resposta Ã  sua pergunta:**

âœ… **Sim, Ã© primeiro o ID, depois o comando:**

```
sendHubitatCommand(deviceId, command, [value])
                    â†‘         â†‘       â†‘
                  Primeiro  Segundo  Terceiro (opcional)
```

**Exemplos:**

- Luzes: `sendHubitatCommand("DEVICE_ID", "on")` â†’ Acende a luz configurada
- TV: `sendHubitatCommand("DEVICE_ID", "cursorUp")` â†’ Move cursor para cima
- Denon: `sendHubitatCommand("DEVICE_ID", "setVolume", "50")` â†’ Seta volume para 50 no Denon



