# Variáveis do Hubitat - Configuração Genérica

## URL de exemplo:

https://cloud.hubitat.com/api/[SEU-UUID]/apps/[APP-ID]/devices?access_token=[SEU-TOKEN]

## Variáveis a serem extraídas:

### HUBITAT_ACCESS_TOKEN

[Seu token de acesso do Hubitat Maker API]

### HUBITAT_BASE_URL

https://cloud.hubitat.com/api/[SEU-UUID]/apps/[APP-ID]/devices

### HUBITAT_FULL_URL

https://cloud.hubitat.com/api/[SEU-UUID]

### WEBHOOK_SHARED_SECRET

(você deve definir uma chave secreta personalizada, ex: seu-cliente-2024-secret)

## Como configurar (genérico)

Se você usar algum **proxy/back-end** para falar com o Hubitat (recomendado para não expor token no browser), configure essas variáveis de ambiente no seu servidor.

Exemplos (Windows PowerShell):

```powershell
$env:HUBITAT_ACCESS_TOKEN = "[seu-token]"
$env:HUBITAT_BASE_URL = "https://cloud.hubitat.com/api/[seu-uuid]/apps/[app-id]/devices"
$env:HUBITAT_FULL_URL = "https://cloud.hubitat.com/api/[seu-uuid]"
$env:WEBHOOK_SHARED_SECRET = "sua-chave-secreta"
```
