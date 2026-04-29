# External Rule Engine para Hubitat

Documento de planejamento tecnico para construir uma engine propria de automacoes externas, sem tentar criar Rule Machines oficiais dentro da Hubitat.

Arquitetura alvo:

```text
Frontend Web/App
  -> Backend externo
  -> Custom App Groovy na Hubitat
  -> Dispositivos autorizados da Hubitat
```

## 1. Definicao do MVP

O MVP deve provar que regras externas podem ser criadas, salvas, assinadas em eventos e executadas localmente pela Hubitat.

Recursos do MVP:

- Custom App Groovy instalado manualmente na Hubitat.
- OAuth ativado e token gerado pelo app.
- Selecao manual de dispositivos permitidos no app Hubitat.
- API REST local no Custom App.
- CRUD basico de regras em JSON.
- Trigger por evento de dispositivo.
- Condicoes simples.
- Acoes `on`, `off`, `setLevel`, `setColorTemperature`, `setThermostatSetpoint` quando autorizadas.
- Delay simples em segundos.
- Execucao manual de uma regra.
- Logs basicos.
- Backend externo sincronizando regras e dispositivos.
- Frontend simples para criar e editar regras por blocos.

Fora do MVP:

- AND/OR complexo.
- Grupos aninhados de condicoes.
- Horarios, dias da semana, sunrise/sunset.
- Variaveis.
- Cancelamento sofisticado de delays.
- Multi-hub.
- Permissoes por usuario dentro da mesma casa.
- Dispositivos criticos, como fechaduras, alarmes e portoes.
- Criar Rule Machines oficiais.

Exemplo de regra MVP:

```text
Quando o sensor de movimento ficar active,
se a luz principal estiver off,
ligar a luz, esperar 5 minutos e desligar a luz.
```

## 2. Custom App da Hubitat

O Custom App e o executor local. Ele deve ficar na Hubitat porque e a Hubitat que recebe eventos dos dispositivos e executa comandos localmente.

Conceitos principais:

- `definition`: metadados do app e OAuth.
- `preferences`: UI de instalacao e selecao de dispositivos autorizados.
- `installed`, `updated`, `initialize`: ciclo de vida.
- `mappings`: endpoints HTTP.
- `createAccessToken`: gera token para os endpoints OAuth.
- `subscribe`: assina eventos dos dispositivos.
- `runIn`: agenda continuacao de acoes apos delays.
- `state`: armazenamento local do app.

Observacao: apps Hubitat rodam em Groovy 2.4 dentro do sandbox da Hubitat. A documentacao oficial destaca que apps podem executar comandos em dispositivos que o usuario selecionou no app e que a UI e definida em `preferences`.

## 3. Endpoints do Custom App

Endpoints locais esperados:

```text
GET    /ping
GET    /devices
GET    /rules
POST   /rules
GET    /rules/:ruleId
PUT    /rules/:ruleId
DELETE /rules/:ruleId
POST   /rules/:ruleId/run
POST   /rules/:ruleId/enable
POST   /rules/:ruleId/disable
```

Formato da URL local:

```text
http://HUB_IP/apps/api/APP_ID/ping?access_token=ACCESS_TOKEN
```

A Maker API usa o mesmo padrao conceitual de endpoints locais com `app id` e `access_token`; aqui faremos uma API propria no Custom App.

## 4. JSON inicial das regras

Schema inicial:

```json
{
  "id": "rule_abc123",
  "name": "Acender luz com movimento",
  "enabled": true,
  "triggers": [],
  "conditions": [],
  "actions": [],
  "createdAt": "2026-04-29T08:00:00.000Z",
  "updatedAt": "2026-04-29T08:00:00.000Z"
}
```

Exemplo:

```json
{
  "name": "Acender luz com movimento",
  "enabled": true,
  "triggers": [
    {
      "type": "device",
      "deviceId": "12",
      "attribute": "motion",
      "operator": "eq",
      "value": "active"
    }
  ],
  "conditions": [
    {
      "type": "device",
      "deviceId": "45",
      "attribute": "switch",
      "operator": "eq",
      "value": "off"
    }
  ],
  "actions": [
    {
      "type": "deviceCommand",
      "deviceId": "45",
      "command": "on",
      "args": []
    },
    {
      "type": "delay",
      "seconds": 300
    },
    {
      "type": "deviceCommand",
      "deviceId": "45",
      "command": "off",
      "args": []
    }
  ]
}
```

## 5. Sistema de triggers

No MVP, cada trigger deve ser:

```json
{
  "type": "device",
  "deviceId": "12",
  "attribute": "motion",
  "operator": "eq",
  "value": "active"
}
```

Fluxo:

1. Regra e criada ou editada.
2. App salva regra no `state.rules`.
3. App chama `rebuildSubscriptions()`.
4. `rebuildSubscriptions()` remove subscriptions antigas com `unsubscribe()`.
5. Para cada regra ativa, o app assina os eventos dos dispositivos/atributos usados como trigger.
6. Quando um evento chega em `deviceEventHandler(evt)`, o app procura regras cujo trigger bate com o evento.
7. Para cada regra disparada, avalia condicoes.
8. Se passar, executa a lista de acoes.

Ponto importante: uma regra pode ter multiplos triggers. No MVP, qualquer trigger que bater dispara a regra. No futuro, pode haver grupos ou janelas temporais.

## 6. Sistema de condicoes

Condicao simples:

```json
{
  "type": "device",
  "deviceId": "45",
  "attribute": "switch",
  "operator": "eq",
  "value": "off"
}
```

Leitura:

```groovy
def current = device.currentValue(condition.attribute)
```

Operadores MVP:

- `eq`
- `neq`
- `gt`
- `gte`
- `lt`
- `lte`
- `contains`

No MVP, usar AND implicito: todas as condicoes precisam ser verdadeiras. Depois evoluir para:

```json
{
  "logic": "and",
  "conditions": [
    { "..." : "..." },
    {
      "logic": "or",
      "conditions": []
    }
  ]
}
```

## 7. Sistema de acoes

Acao de comando:

```json
{
  "type": "deviceCommand",
  "deviceId": "45",
  "command": "setLevel",
  "args": [50]
}
```

Delay:

```json
{
  "type": "delay",
  "seconds": 300
}
```

Execucao:

- Sem argumentos: `device."${command}"()`
- Com argumentos: `device."${command}"(*args)`
- Delay: salvar contexto em `state.executions` e chamar `runIn(seconds, "continueRuleExecution", [data: ...])`.

Comandos permitidos no MVP:

```text
switch: on, off
dimmer: on, off, setLevel
colorTemperature: setColorTemperature
thermostat: setHeatingSetpoint, setCoolingSetpoint, setThermostatSetpoint
```

Nao liberar comando arbitrario. O comando precisa estar em allowlist por capacidade.

## 8. Seguranca

Regras obrigatorias:

- A Hubitat so deve controlar dispositivos selecionados no `preferences`.
- Validar todo `deviceId` recebido.
- Validar todo comando recebido.
- Validar argumentos por comando.
- Limitar tamanho do JSON.
- Limitar quantidade de regras.
- Limitar quantidade de triggers, condicoes e acoes por regra.
- Rate limit por minuto.
- Nao comecar com fechaduras, alarmes, sirenes, portoes, garagem ou HSM.
- Nao expor a Hubitat diretamente na internet.
- Se houver acesso remoto, usar VPN, tunnel autenticado ou relay seguro.
- Backend sempre via HTTPS.
- Access tokens criptografados no banco.
- Logs sem tokens.

Limites iniciais sugeridos:

```text
maxRules = 100
maxTriggersPerRule = 5
maxConditionsPerRule = 10
maxActionsPerRule = 20
maxRulePayloadBytes = 20000
maxExecutionsPerMinute = 30
maxDelaySeconds = 86400
```

## 9. Backend externo

Stack recomendada para MVP:

- Node.js + NestJS se o projeto for crescer.
- Node.js + Express se quiser velocidade inicial.
- PostgreSQL em producao.
- SQLite para prototipo local.
- Prisma como ORM.
- JWT para login.
- HTTPS em producao.
- Zod para validar payloads.

Responsabilidades:

- Login de usuarios.
- Cadastro de hubs.
- Armazenar IP local da Hubitat.
- Armazenar `appId` e access token do Custom App.
- Sincronizar dispositivos via `GET /devices`.
- Salvar regras no banco.
- Validar JSON antes de enviar.
- Enviar regra para a Hubitat.
- Manter versoes de regras.
- Registrar logs de execucao e erros.
- Expor API para o frontend.

Nota de rede: se o backend estiver em nuvem e a Hubitat estiver apenas na LAN, o backend nao consegue chamar `http://IP_LOCAL`. Nesse caso, usar um executor local, tunnel seguro, VPN ou o proprio tablet/app como ponte nao confiavel. Para automacao real, preferir executor local ou tunnel autenticado.

## 10. Banco de dados

Tabelas sugeridas:

### users

- `id`
- `name`
- `email`
- `password_hash`
- `role`
- `created_at`
- `updated_at`

### hubs

- `id`
- `user_id`
- `name`
- `local_ip`
- `hub_uid`
- `app_id`
- `access_token_encrypted`
- `last_seen_at`
- `created_at`
- `updated_at`

### devices

- `id`
- `hub_id`
- `hubitat_device_id`
- `label`
- `name`
- `capabilities`
- `attributes`
- `commands`
- `authorized`
- `last_sync_at`

### rules

- `id`
- `hub_id`
- `name`
- `enabled`
- `definition_json`
- `remote_rule_id`
- `version`
- `created_by`
- `created_at`
- `updated_at`

### rule_versions

- `id`
- `rule_id`
- `version`
- `definition_json`
- `created_by`
- `created_at`

### execution_logs

- `id`
- `hub_id`
- `rule_id`
- `status`
- `trigger_event`
- `message`
- `started_at`
- `finished_at`
- `error_json`

## 11. Frontend

Stack recomendada:

- React ou Next.js.
- Tailwind CSS.
- shadcn/ui.
- React Hook Form.
- Zod.
- TanStack Query.

Telas:

- Login.
- Cadastro da Hubitat.
- Testar conexao com hub.
- Lista de dispositivos autorizados.
- Lista de regras.
- Criar regra.
- Editar regra.
- Testar regra.
- Logs.
- Historico de versoes.

## 12. Editor visual de regras

Formato por blocos:

```text
QUANDO:
[Dispositivo] [Atributo] [Operador] [Valor]

SE:
[Dispositivo] [Atributo] [Operador] [Valor]

ENTAO:
[Comando] [Dispositivo] [Parametros]
[Esperar] [X segundos]
[Comando] [Dispositivo] [Parametros]
```

UX recomendada:

- Comecar simples: uma coluna com blocos empilhados.
- Validar cada bloco antes de salvar.
- Mostrar linguagem natural:
  - "Quando Movimento Sala ficar active"
  - "Se Luz Sala estiver off"
  - "Ligar Luz Sala"
  - "Esperar 5 minutos"
  - "Desligar Luz Sala"
- Antes de salvar, mostrar revisao.

## 13. Logs e debug

Na Hubitat:

- Regra criada.
- Regra atualizada.
- Regra apagada.
- Evento recebido.
- Trigger comparado.
- Condicoes aprovadas/reprovadas.
- Acao executada.
- Delay iniciado.
- Delay retomado.
- Erro de comando.
- Rate limit aplicado.

No backend:

- Request recebida.
- Payload validado.
- Envio para Hubitat.
- Resposta da Hubitat.
- Erro de rede.
- Hub offline.
- Versao salva.

## 14. Plano de testes

Testes manuais MVP:

- `GET /ping` responde.
- `GET /devices` lista apenas dispositivos autorizados.
- `POST /rules` cria regra valida.
- `GET /rules` lista regra criada.
- `GET /rules/:ruleId` retorna regra.
- `PUT /rules/:ruleId` edita regra.
- `DELETE /rules/:ruleId` remove regra.
- `POST /rules/:ruleId/run` executa manualmente.
- Evento real de sensor dispara regra.
- Condicao verdadeira permite execucao.
- Condicao falsa bloqueia execucao.
- Delay executa continuacao.
- Dispositivo nao autorizado e bloqueado.
- Comando nao permitido e bloqueado.
- JSON grande demais e bloqueado.
- Hub offline no backend gera erro claro.
- Token invalido retorna erro.

## 15. Roadmap de versoes

MVP:

- Trigger por dispositivo.
- Condicao simples.
- Acoes `on`, `off`, `setLevel`.
- Delay simples.
- Criar, editar, apagar e executar regras.

Versao 2:

- AND/OR.
- Grupos de condicoes.
- Duplicar regra.
- Ativar/desativar regra.
- Reordenar acoes.
- Historico de versoes.

Versao 3:

- Horarios.
- Dias da semana.
- Modos da Hubitat.
- Sunrise/sunset.
- Variaveis.
- Cancelamento de delays.
- Logs avancados.

Versao 4:

- Editor visual em fluxo.
- Templates de automacao.
- Multi-hub.
- Backup em nuvem.
- Permissoes por usuario.

## 16. Ordem pratica de desenvolvimento

Sequencia recomendada:

1. Criar `hubitat/ExternalRuleEngine.groovy`.
2. Instalar Custom App vazio na Hubitat.
3. Criar `definition` com OAuth.
4. Criar `preferences` com selecao de dispositivos.
5. Criar `installed`, `updated`, `initialize`.
6. Criar endpoint `GET /ping`.
7. Ativar OAuth no app instalado.
8. Gerar token com `createAccessToken`.
9. Criar `GET /devices`.
10. Criar `POST /rules`.
11. Salvar regras no `state.rules`.
12. Criar `GET /rules`.
13. Criar `GET /rules/:ruleId`.
14. Criar `PUT /rules/:ruleId`.
15. Criar `DELETE /rules/:ruleId`.
16. Implementar `findAllowedDevice`.
17. Implementar allowlist de comandos.
18. Implementar `rebuildSubscriptions`.
19. Implementar handler de eventos.
20. Implementar comparador de trigger.
21. Implementar validador de condicoes.
22. Implementar executor de acoes sem delay.
23. Implementar delay com `runIn`.
24. Criar backend Express/Nest.
25. Criar cliente HTTP Hubitat.
26. Criar frontend simples.
27. Adicionar logs.
28. Adicionar seguranca e limites.
29. Testar com dispositivos reais nao criticos.

## 17. Estrutura de pastas

```text
hubitat/
  ExternalRuleEngine.groovy

backend/
  src/
    auth/
    hubs/
    devices/
    rules/
    hubitat-client/
    logs/
  prisma/
    schema.prisma
  package.json

frontend/
  src/
    app/
    components/
      RuleBuilder/
      DevicePicker/
      ConditionBuilder/
      ActionBuilder/
    services/
      api.ts
  package.json
```

## 18. Codigo inicial - Custom App Groovy

Arquivo: `hubitat/ExternalRuleEngine.groovy`

```groovy
import groovy.json.JsonOutput

definition(
  name: "External Rule Engine",
  namespace: "eletrize",
  author: "Eletrize",
  description: "Recebe regras externas em JSON e executa automacoes locais.",
  category: "Convenience",
  iconUrl: "",
  iconX2Url: "",
  oauth: true
)

preferences {
  page(name: "mainPage", title: "External Rule Engine", install: true, uninstall: true) {
    section("Dispositivos autorizados") {
      input "switches", "capability.switch", title: "Switches e luzes", multiple: true, required: false
      input "dimmers", "capability.switchLevel", title: "Dimmers", multiple: true, required: false
      input "motions", "capability.motionSensor", title: "Sensores de movimento", multiple: true, required: false
      input "contacts", "capability.contactSensor", title: "Sensores de contato", multiple: true, required: false
      input "thermostats", "capability.thermostat", title: "Termostatos", multiple: true, required: false
    }
    section("API") {
      paragraph "Salve o app e use os endpoints OAuth locais. O token sera criado automaticamente."
      paragraph "App ID: ${app?.id ?: 'salve para gerar'}"
      paragraph "Access token: ${state.accessToken ?: 'sera criado ao salvar'}"
    }
  }
}

mappings {
  path("/ping") {
    action: [GET: "apiPing"]
  }
  path("/devices") {
    action: [GET: "apiDevices"]
  }
  path("/rules") {
    action: [GET: "apiListRules", POST: "apiCreateRule"]
  }
  path("/rules/:ruleId") {
    action: [GET: "apiGetRule", PUT: "apiUpdateRule", DELETE: "apiDeleteRule"]
  }
  path("/rules/:ruleId/run") {
    action: [POST: "apiRunRule"]
  }
  path("/rules/:ruleId/enable") {
    action: [POST: "apiEnableRule"]
  }
  path("/rules/:ruleId/disable") {
    action: [POST: "apiDisableRule"]
  }
}

def installed() {
  log.info "External Rule Engine installed"
  initialize()
}

def updated() {
  log.info "External Rule Engine updated"
  unsubscribe()
  unschedule()
  initialize()
}

def initialize() {
  if (!state.rules) state.rules = [:]
  if (!state.executions) state.executions = [:]
  if (!state.executionRate) state.executionRate = [:]

  if (!state.accessToken) {
    try {
      createAccessToken()
      log.info "Access token created"
    } catch (Exception e) {
      log.warn "Could not create access token. Enable OAuth for this app code. ${e.message}"
    }
  }

  rebuildSubscriptions()
}

def apiPing() {
  renderJson([
    ok: true,
    appId: app.id,
    now: now(),
    ruleCount: getRulesMap().size()
  ])
}

def apiDevices() {
  def devices = allowedDevices().collect { d ->
    [
      id: "${d.id}",
      label: d.displayName,
      name: d.name,
      capabilities: safeCapabilities(d),
      attributes: safeAttributes(d),
      commands: allowedCommandsForDevice(d)
    ]
  }
  renderJson([devices: devices])
}

def apiListRules() {
  renderJson([rules: getRulesMap().values() as List])
}

def apiGetRule() {
  def rule = getRulesMap()[params.ruleId]
  if (!rule) return renderError(404, "Rule not found")
  renderJson(rule)
}

def apiCreateRule() {
  def payload = request.JSON
  def rule = normalizeRule(payload)
  validateRuleOrThrow(rule)

  def rules = getRulesMap()
  rules[rule.id] = rule
  state.rules = rules

  rebuildSubscriptions()
  log.info "Rule created: ${rule.name} (${rule.id})"
  renderJson(rule, 201)
}

def apiUpdateRule() {
  def rules = getRulesMap()
  def existing = rules[params.ruleId]
  if (!existing) return renderError(404, "Rule not found")

  def payload = request.JSON
  def rule = normalizeRule(payload, params.ruleId, existing.createdAt)
  validateRuleOrThrow(rule)

  rules[rule.id] = rule
  state.rules = rules

  rebuildSubscriptions()
  log.info "Rule updated: ${rule.name} (${rule.id})"
  renderJson(rule)
}

def apiDeleteRule() {
  def rules = getRulesMap()
  if (!rules[params.ruleId]) return renderError(404, "Rule not found")
  rules.remove(params.ruleId)
  state.rules = rules
  rebuildSubscriptions()
  renderJson([ok: true])
}

def apiEnableRule() {
  setRuleEnabled(params.ruleId, true)
}

def apiDisableRule() {
  setRuleEnabled(params.ruleId, false)
}

def apiRunRule() {
  def rule = getRulesMap()[params.ruleId]
  if (!rule) return renderError(404, "Rule not found")
  runRule(rule, [manual: true])
  renderJson([ok: true, message: "Rule execution started"])
}

private def setRuleEnabled(String ruleId, Boolean enabled) {
  def rules = getRulesMap()
  def rule = rules[ruleId]
  if (!rule) return renderError(404, "Rule not found")
  rule.enabled = enabled
  rule.updatedAt = isoNow()
  rules[ruleId] = rule
  state.rules = rules
  rebuildSubscriptions()
  renderJson(rule)
}

private Map getRulesMap() {
  return state.rules instanceof Map ? state.rules : [:]
}

private List allowedDevices() {
  return []
    .plus(switches ?: [])
    .plus(dimmers ?: [])
    .plus(motions ?: [])
    .plus(contacts ?: [])
    .plus(thermostats ?: [])
    .findAll { it != null }
    .unique { it.id }
}

private def findAllowedDevice(deviceId) {
  def id = "${deviceId}".trim()
  if (!id) return null
  return allowedDevices().find { "${it.id}" == id }
}

private List safeCapabilities(device) {
  try {
    return device.capabilities*.name?.findAll { it }?.unique() ?: []
  } catch (ignored) {
    return []
  }
}

private List safeAttributes(device) {
  try {
    return device.supportedAttributes*.name?.findAll { it }?.unique() ?: []
  } catch (ignored) {
    return []
  }
}

private List allowedCommandsForDevice(device) {
  def caps = safeCapabilities(device).collect { it.toLowerCase() }
  def out = [] as Set
  if (caps.contains("switch")) out.addAll(["on", "off"])
  if (caps.contains("switchlevel")) out.addAll(["on", "off", "setLevel"])
  if (caps.contains("colortemperature")) out.add("setColorTemperature")
  if (caps.contains("thermostat")) out.addAll(["setHeatingSetpoint", "setCoolingSetpoint", "setThermostatSetpoint"])
  return out as List
}

private Boolean isCommandAllowed(device, String command) {
  return allowedCommandsForDevice(device).contains(command)
}

private Map normalizeRule(payload, String forcedId = null, String existingCreatedAt = null) {
  def nowIso = isoNow()
  return [
    id: forcedId ?: (payload?.id ?: "rule_${now()}_${Math.abs(new Random().nextInt())}").toString(),
    name: (payload?.name ?: "Nova regra").toString().take(120),
    enabled: payload?.enabled != false,
    triggers: payload?.triggers instanceof List ? payload.triggers : [],
    conditions: payload?.conditions instanceof List ? payload.conditions : [],
    actions: payload?.actions instanceof List ? payload.actions : [],
    createdAt: existingCreatedAt ?: (payload?.createdAt ?: nowIso).toString(),
    updatedAt: nowIso
  ]
}

private void validateRuleOrThrow(Map rule) {
  if (!rule.name?.trim()) throw new IllegalArgumentException("Rule name is required")
  if (rule.triggers.size() > 5) throw new IllegalArgumentException("Too many triggers")
  if (rule.conditions.size() > 10) throw new IllegalArgumentException("Too many conditions")
  if (rule.actions.size() > 20) throw new IllegalArgumentException("Too many actions")

  rule.triggers.each { t ->
    if (t.type != "device") throw new IllegalArgumentException("Only device triggers are supported")
    if (!findAllowedDevice(t.deviceId)) throw new IllegalArgumentException("Unauthorized trigger device ${t.deviceId}")
  }

  rule.conditions.each { c ->
    if (c.type != "device") throw new IllegalArgumentException("Only device conditions are supported")
    if (!findAllowedDevice(c.deviceId)) throw new IllegalArgumentException("Unauthorized condition device ${c.deviceId}")
  }

  rule.actions.each { a ->
    if (a.type == "delay") {
      Integer seconds = safeInt(a.seconds, 0)
      if (seconds < 1 || seconds > 86400) throw new IllegalArgumentException("Invalid delay")
      return
    }

    if (a.type != "deviceCommand") throw new IllegalArgumentException("Unsupported action ${a.type}")
    def device = findAllowedDevice(a.deviceId)
    if (!device) throw new IllegalArgumentException("Unauthorized action device ${a.deviceId}")
    if (!isCommandAllowed(device, "${a.command}")) throw new IllegalArgumentException("Command not allowed: ${a.command}")
  }
}

def rebuildSubscriptions() {
  unsubscribe()
  def rules = getRulesMap().values().findAll { it.enabled == true }
  def subscribed = [] as Set

  rules.each { rule ->
    (rule.triggers ?: []).each { trigger ->
      if (trigger.type != "device") return
      def device = findAllowedDevice(trigger.deviceId)
      def attribute = "${trigger.attribute}".trim()
      if (!device || !attribute) return

      def key = "${device.id}:${attribute}"
      if (subscribed.contains(key)) return
      subscribed.add(key)
      subscribe(device, attribute, deviceEventHandler)
      log.info "Subscribed ${device.displayName}.${attribute}"
    }
  }
}

def deviceEventHandler(evt) {
  log.info "Event received: ${evt.deviceId}.${evt.name}=${evt.value}"
  def matching = getRulesMap().values().findAll { rule ->
    rule.enabled == true && ruleMatchesEvent(rule, evt)
  }

  matching.each { rule ->
    runRule(rule, [event: [deviceId: "${evt.deviceId}", name: evt.name, value: evt.value]])
  }
}

private Boolean ruleMatchesEvent(Map rule, evt) {
  return (rule.triggers ?: []).any { trigger ->
    if (trigger.type != "device") return false
    if ("${trigger.deviceId}" != "${evt.deviceId}") return false
    if ("${trigger.attribute}" != "${evt.name}") return false
    return compareValues(evt.value, trigger.operator ?: "eq", trigger.value)
  }
}

private void runRule(Map rule, Map context = [:]) {
  if (!allowExecutionNow(rule.id)) {
    log.warn "Rate limit reached for ${rule.id}"
    return
  }

  if (!conditionsPass(rule.conditions ?: [])) {
    log.info "Rule conditions failed: ${rule.name}"
    return
  }

  def executionId = "exec_${now()}_${Math.abs(new Random().nextInt())}"
  state.executions[executionId] = [
    ruleId: rule.id,
    actions: rule.actions,
    index: 0,
    context: context,
    startedAt: isoNow()
  ]

  log.info "Rule started: ${rule.name}"
  executeNextAction(executionId)
}

private Boolean conditionsPass(List conditions) {
  return conditions.every { condition ->
    def device = findAllowedDevice(condition.deviceId)
    if (!device) return false
    def current = device.currentValue("${condition.attribute}")
    def ok = compareValues(current, condition.operator ?: "eq", condition.value)
    log.info "Condition ${device.displayName}.${condition.attribute}: ${current} ${condition.operator} ${condition.value} => ${ok}"
    return ok
  }
}

private void executeNextAction(String executionId) {
  def execution = state.executions[executionId]
  if (!execution) return

  Integer index = safeInt(execution.index, 0)
  List actions = execution.actions ?: []

  if (index >= actions.size()) {
    log.info "Execution completed: ${executionId}"
    state.executions.remove(executionId)
    return
  }

  def action = actions[index]
  execution.index = index + 1
  state.executions[executionId] = execution

  if (action.type == "delay") {
    Integer seconds = safeInt(action.seconds, 1)
    log.info "Delay started: ${seconds}s (${executionId})"
    runIn(seconds, "continueRuleExecution", [data: [executionId: executionId], overwrite: false])
    return
  }

  executeDeviceCommand(action)
  executeNextAction(executionId)
}

def continueRuleExecution(data) {
  def executionId = data?.executionId
  if (!executionId) return
  log.info "Delay resumed: ${executionId}"
  executeNextAction(executionId)
}

private void executeDeviceCommand(action) {
  def device = findAllowedDevice(action.deviceId)
  if (!device) throw new IllegalArgumentException("Unauthorized device ${action.deviceId}")

  String command = "${action.command}".trim()
  if (!isCommandAllowed(device, command)) {
    throw new IllegalArgumentException("Command not allowed ${command}")
  }

  List args = action.args instanceof List ? action.args : []
  log.info "Executing ${device.displayName}.${command}(${args.join(', ')})"

  if (args.size() == 0) {
    device."${command}"()
  } else {
    device."${command}"(*args)
  }
}

private Boolean compareValues(current, String operator, expected) {
  def op = "${operator ?: 'eq'}".toLowerCase()
  def left = current
  def right = expected

  if (op in ["gt", "gte", "lt", "lte"]) {
    BigDecimal l = safeDecimal(left)
    BigDecimal r = safeDecimal(right)
    if (l == null || r == null) return false
    if (op == "gt") return l > r
    if (op == "gte") return l >= r
    if (op == "lt") return l < r
    if (op == "lte") return l <= r
  }

  if (op == "neq") return "${left}" != "${right}"
  if (op == "contains") return "${left}".contains("${right}")
  return "${left}" == "${right}"
}

private Boolean allowExecutionNow(String ruleId) {
  Long minute = Math.floor(now() / 60000L) as Long
  def bucket = state.executionRate ?: [:]
  def key = "${ruleId}:${minute}"
  Integer count = safeInt(bucket[key], 0)
  if (count >= 30) return false
  bucket[key] = count + 1
  state.executionRate = bucket.findAll { k, v -> k.endsWith(":${minute}") }
  return true
}

private Integer safeInt(value, Integer fallback = 0) {
  try {
    return value as Integer
  } catch (ignored) {
    return fallback
  }
}

private BigDecimal safeDecimal(value) {
  try {
    return new BigDecimal("${value}")
  } catch (ignored) {
    return null
  }
}

private String isoNow() {
  return new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", location.timeZone)
}

private void renderJson(payload, Integer statusCode = 200) {
  render status: statusCode, contentType: "application/json", data: JsonOutput.toJson(payload)
}

private void renderError(Integer statusCode, String message) {
  renderJson([ok: false, error: message], statusCode)
}
```

## 19. Codigo inicial - cliente Node.js para Hubitat

```ts
type HubitatConfig = {
  localIp: string;
  appId: string;
  accessToken: string;
};

type RulePayload = {
  name: string;
  enabled: boolean;
  triggers: unknown[];
  conditions: unknown[];
  actions: unknown[];
};

function hubitatUrl(hub: HubitatConfig, path: string) {
  const cleanPath = path.replace(/^\/+/, "");
  const url = new URL(`http://${hub.localIp}/apps/api/${hub.appId}/${cleanPath}`);
  url.searchParams.set("access_token", hub.accessToken);
  return url.toString();
}

export async function pingHub(hub: HubitatConfig) {
  const res = await fetch(hubitatUrl(hub, "/ping"));
  if (!res.ok) throw new Error(`Hubitat ping failed: ${res.status}`);
  return res.json();
}

export async function listHubDevices(hub: HubitatConfig) {
  const res = await fetch(hubitatUrl(hub, "/devices"));
  if (!res.ok) throw new Error(`Hubitat devices failed: ${res.status}`);
  return res.json();
}

export async function createHubRule(hub: HubitatConfig, rule: RulePayload) {
  const res = await fetch(hubitatUrl(hub, "/rules"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(rule),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Hubitat create rule failed: ${res.status} ${body}`);
  }

  return res.json();
}

export async function runHubRule(hub: HubitatConfig, ruleId: string) {
  const res = await fetch(hubitatUrl(hub, `/rules/${ruleId}/run`), {
    method: "POST",
  });
  if (!res.ok) throw new Error(`Hubitat run rule failed: ${res.status}`);
  return res.json();
}
```

## 20. Exemplo Express para POST /rules no backend

```ts
import express from "express";
import { z } from "zod";
import { createHubRule } from "./hubitat-client";

const app = express();
app.use(express.json({ limit: "32kb" }));

const deviceTriggerSchema = z.object({
  type: z.literal("device"),
  deviceId: z.string().min(1),
  attribute: z.string().min(1),
  operator: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "contains"]),
  value: z.union([z.string(), z.number(), z.boolean()]),
});

const deviceConditionSchema = deviceTriggerSchema;

const actionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("deviceCommand"),
    deviceId: z.string().min(1),
    command: z.string().min(1),
    args: z.array(z.union([z.string(), z.number(), z.boolean()])).default([]),
  }),
  z.object({
    type: z.literal("delay"),
    seconds: z.number().int().min(1).max(86400),
  }),
]);

const ruleSchema = z.object({
  name: z.string().min(1).max(120),
  enabled: z.boolean().default(true),
  triggers: z.array(deviceTriggerSchema).min(1).max(5),
  conditions: z.array(deviceConditionSchema).max(10).default([]),
  actions: z.array(actionSchema).min(1).max(20),
});

app.post("/api/hubs/:hubId/rules", async (req, res, next) => {
  try {
    const rule = ruleSchema.parse(req.body);

    const hub = await loadHubForCurrentUser(req.params.hubId, req.user.id);
    const remoteRule = await createHubRule(
      {
        localIp: hub.localIp,
        appId: hub.appId,
        accessToken: decrypt(hub.accessTokenEncrypted),
      },
      rule,
    );

    const saved = await prisma.rule.create({
      data: {
        hubId: hub.id,
        name: remoteRule.name,
        enabled: remoteRule.enabled,
        remoteRuleId: remoteRule.id,
        definitionJson: remoteRule,
        version: 1,
        createdBy: req.user.id,
      },
    });

    res.status(201).json(saved);
  } catch (error) {
    next(error);
  }
});
```

## Referencias usadas

- Hubitat App Overview: custom apps rodam em Groovy 2.4, usam `preferences` e podem operar dispositivos selecionados pelo usuario.
- Hubitat Maker API: padrao local `http://hub/apps/api/appId/path?access_token=token` e alerta de seguranca sobre tokens.
- Hubitat Automating your Devices: confirma que Rule Machine e app built-in para automacoes complexas, mas este projeto evita depender de API nao documentada para criar Rule Machines oficiais.

