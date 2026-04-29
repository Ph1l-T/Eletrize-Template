import groovy.json.JsonOutput
import groovy.json.JsonSlurper

definition(
  name: "External Rule Engine",
  namespace: "eletrize",
  author: "Eletrize",
  description: "Recebe regras externas em JSON, escuta eventos e executa automacoes locais.",
  category: "Convenience",
  iconUrl: "",
  iconX2Url: "",
  oauth: true
)

preferences {
  page(name: "mainPage", title: "External Rule Engine", install: true, uninstall: true) {
    section("Dispositivos autorizados") {
      input "switchDevices", "capability.switch", title: "Switches e luzes", multiple: true, required: false
      input "dimmerDevices", "capability.switchLevel", title: "Dimmers", multiple: true, required: false
      input "motionDevices", "capability.motionSensor", title: "Sensores de movimento", multiple: true, required: false
      input "contactDevices", "capability.contactSensor", title: "Sensores de contato", multiple: true, required: false
      input "thermostatDevices", "capability.thermostat", title: "Termostatos", multiple: true, required: false
    }

    section("API") {
      paragraph "Depois de salvar, use a URL local: http://HUB_IP/apps/api/${app?.id ?: 'APP_ID'}/ping?access_token=${state.accessToken ?: 'ACCESS_TOKEN'}"
      paragraph "App ID: ${app?.id ?: 'salve o app para gerar'}"
      paragraph "Access token: ${state.accessToken ?: 'sera criado ao salvar'}"
    }

    section("Limites e logs") {
      input "enableInfoLogging", "bool", title: "Ativar logs informativos", defaultValue: true, required: false
      input "enableDebugLogging", "bool", title: "Ativar logs detalhados", defaultValue: false, required: false
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
  logInfo("installed")
  initialize()
}

def updated() {
  logInfo("updated")
  unsubscribe()
  initialize()
}

def initialize() {
  if (!(state.rules instanceof Map)) state.rules = [:]
  if (!(state.executions instanceof Map)) state.executions = [:]
  if (!(state.executionRate instanceof Map)) state.executionRate = [:]

  if (!state.accessToken) {
    try {
      createAccessToken()
      logInfo("access token created")
    } catch (Exception e) {
      log.warn "Could not create access token. Enable OAuth for this app code. ${e.message}"
    }
  }

  rebuildSubscriptions()
}

def apiPing() {
  endpoint {
    renderJson([
      ok: true,
      appId: "${app.id}",
      now: now(),
      ruleCount: getRulesMap().size()
    ])
  }
}

def apiDevices() {
  endpoint {
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
}

def apiListRules() {
  endpoint {
    renderJson([rules: getRulesMap().values() as List])
  }
}

def apiGetRule() {
  endpoint {
    def rule = getRulesMap()[ruleIdParam()]
    if (!rule) return renderError(404, "Rule not found")
    renderJson(rule)
  }
}

def apiCreateRule() {
  endpoint {
    def payload = readJsonBody()
    rejectOversizedPayload(payload)

    def rules = getRulesMap()
    if (rules.size() >= 100) {
      throw new IllegalArgumentException("Rule limit reached")
    }

    def rule = normalizeRule(payload)
    validateRuleOrThrow(rule)

    rules[rule.id] = rule
    state.rules = rules

    rebuildSubscriptions()
    logInfo("rule created: ${rule.name} (${rule.id})")
    renderJson(rule, 201)
  }
}

def apiUpdateRule() {
  endpoint {
    def rules = getRulesMap()
    def ruleId = ruleIdParam()
    def existing = rules[ruleId]
    if (!existing) return renderError(404, "Rule not found")

    def payload = readJsonBody()
    rejectOversizedPayload(payload)

    def rule = normalizeRule(payload, ruleId, existing.createdAt)
    validateRuleOrThrow(rule)

    rules[rule.id] = rule
    state.rules = rules
    cancelExecutionsForRule(rule.id)

    rebuildSubscriptions()
    logInfo("rule updated: ${rule.name} (${rule.id})")
    renderJson(rule)
  }
}

def apiDeleteRule() {
  endpoint {
    def ruleId = ruleIdParam()
    def rules = getRulesMap()
    if (!rules[ruleId]) return renderError(404, "Rule not found")

    rules.remove(ruleId)
    state.rules = rules
    cancelExecutionsForRule(ruleId)
    rebuildSubscriptions()

    logInfo("rule deleted: ${ruleId}")
    renderJson([ok: true])
  }
}

def apiEnableRule() {
  endpoint {
    setRuleEnabled(ruleIdParam(), true)
  }
}

def apiDisableRule() {
  endpoint {
    setRuleEnabled(ruleIdParam(), false)
  }
}

def apiRunRule() {
  endpoint {
    def rule = getRulesMap()[ruleIdParam()]
    if (!rule) return renderError(404, "Rule not found")

    runRule(rule, [manual: true])
    renderJson([ok: true, message: "Rule execution started"])
  }
}

private def setRuleEnabled(String ruleId, Boolean enabled) {
  def rules = getRulesMap()
  def rule = rules[ruleId]
  if (!rule) return renderError(404, "Rule not found")

  rule.enabled = enabled
  rule.updatedAt = isoNow()
  rules[ruleId] = rule
  state.rules = rules

  if (!enabled) cancelExecutionsForRule(ruleId)
  rebuildSubscriptions()
  renderJson(rule)
}

def rebuildSubscriptions() {
  unsubscribe()

  def subscribed = [] as Set
  getRulesMap().values().findAll { it.enabled == true }.each { rule ->
    (rule.triggers ?: []).each { trigger ->
      if (trigger.type == "device") {
        def device = findAllowedDevice(trigger.deviceId)
        def attribute = "${trigger.attribute ?: ""}".trim()

        if (device && attribute) {
          def key = "${device.id}:${attribute}"
          if (!subscribed.contains(key)) {
            subscribed.add(key)
            subscribe(device, attribute, deviceEventHandler)
            logDebug("subscribed ${device.displayName}.${attribute}")
          }
        }
      }
    }
  }
}

def deviceEventHandler(evt) {
  def eventDeviceId = eventDeviceId(evt)
  def eventName = "${evt?.name ?: ""}"
  def eventValue = evt?.value

  logInfo("event received: ${eventDeviceId}.${eventName}=${eventValue}")

  def matchingRules = getRulesMap().values().findAll { rule ->
    rule.enabled == true && ruleMatchesEvent(rule, eventDeviceId, eventName, eventValue)
  }

  matchingRules.each { rule ->
    runRule(rule, [event: [deviceId: eventDeviceId, name: eventName, value: eventValue]])
  }
}

def continueRuleExecution(data) {
  def executionId = data?.executionId
  if (!executionId) return

  logInfo("delay resumed: ${executionId}")
  executeNextAction("${executionId}")
}

private Boolean ruleMatchesEvent(Map rule, String eventDeviceId, String eventName, eventValue) {
  return (rule.triggers ?: []).any { trigger ->
    trigger.type == "device" &&
      "${trigger.deviceId}" == "${eventDeviceId}" &&
      "${trigger.attribute}" == "${eventName}" &&
      compareValues(eventValue, trigger.operator ?: "eq", trigger.value)
  }
}

private void runRule(Map rule, Map context = [:]) {
  if (!allowExecutionNow(rule.id)) {
    log.warn "Rate limit reached for ${rule.id}"
    return
  }

  if (!conditionsPass(rule.conditions ?: [])) {
    logInfo("conditions failed: ${rule.name}")
    return
  }

  def executionId = "exec_${now()}_${Math.abs(new Random().nextInt())}"
  def executions = getExecutionsMap()
  executions[executionId] = [
    ruleId: rule.id,
    actions: rule.actions ?: [],
    index: 0,
    context: context,
    startedAt: isoNow()
  ]
  state.executions = executions

  logInfo("rule started: ${rule.name} (${executionId})")
  executeNextAction(executionId)
}

private Boolean conditionsPass(List conditions) {
  return conditions.every { condition ->
    def device = findAllowedDevice(condition.deviceId)
    if (!device) return false

    def attribute = "${condition.attribute ?: ""}".trim()
    def current = device.currentValue(attribute)
    def ok = compareValues(current, condition.operator ?: "eq", condition.value)
    logDebug("condition ${device.displayName}.${attribute}: ${current} ${condition.operator} ${condition.value} => ${ok}")
    return ok
  }
}

private void executeNextAction(String executionId) {
  try {
    def executions = getExecutionsMap()
    def execution = executions[executionId]
    if (!execution) return

    Integer index = safeInt(execution.index, 0)
    List actions = execution.actions instanceof List ? execution.actions : []

    if (index >= actions.size()) {
      logInfo("execution completed: ${executionId}")
      executions.remove(executionId)
      state.executions = executions
      return
    }

    def action = actions[index]
    execution.index = index + 1
    executions[executionId] = execution
    state.executions = executions

    if (action.type == "delay") {
      Integer seconds = safeInt(action.seconds, 1)
      logInfo("delay started: ${seconds}s (${executionId})")
      runIn(seconds, "continueRuleExecution", [data: [executionId: executionId], overwrite: false])
      return
    }

    executeDeviceCommand(action)
    executeNextAction(executionId)
  } catch (Exception e) {
    log.warn "Execution failed ${executionId}: ${e.message}"
    def executions = getExecutionsMap()
    executions.remove(executionId)
    state.executions = executions
  }
}

private void executeDeviceCommand(action) {
  def device = findAllowedDevice(action.deviceId)
  if (!device) throw new IllegalArgumentException("Unauthorized device ${action.deviceId}")

  String command = "${action.command ?: ""}".trim()
  if (!isCommandAllowed(device, command)) {
    throw new IllegalArgumentException("Command not allowed: ${command}")
  }

  List args = normalizeCommandArgs(command, action.args instanceof List ? action.args : [])
  logInfo("executing ${device.displayName}.${command}(${args.join(', ')})")

  if (args.isEmpty()) {
    device."${command}"()
  } else {
    device."${command}"(*args)
  }
}

private Map normalizeRule(payload, String forcedId = null, String existingCreatedAt = null) {
  if (!(payload instanceof Map)) {
    throw new IllegalArgumentException("JSON object expected")
  }

  def nowIso = isoNow()
  return [
    id: forcedId ?: sanitizeId(payload.id ?: "rule_${now()}_${Math.abs(new Random().nextInt())}"),
    name: "${payload.name ?: "Nova regra"}".trim().take(120),
    enabled: payload.enabled != false,
    triggers: payload.triggers instanceof List ? payload.triggers : [],
    conditions: payload.conditions instanceof List ? payload.conditions : [],
    actions: payload.actions instanceof List ? payload.actions : [],
    createdAt: existingCreatedAt ?: "${payload.createdAt ?: nowIso}",
    updatedAt: nowIso
  ]
}

private void validateRuleOrThrow(Map rule) {
  if (!rule.name?.trim()) throw new IllegalArgumentException("Rule name is required")
  if (rule.triggers.size() > 5) throw new IllegalArgumentException("Too many triggers")
  if (rule.conditions.size() > 10) throw new IllegalArgumentException("Too many conditions")
  if (rule.actions.size() > 20) throw new IllegalArgumentException("Too many actions")
  if (rule.triggers.isEmpty()) throw new IllegalArgumentException("At least one trigger is required")
  if (rule.actions.isEmpty()) throw new IllegalArgumentException("At least one action is required")

  rule.triggers.each { trigger ->
    validateDeviceAttributeBlock(trigger, "trigger")
  }

  rule.conditions.each { condition ->
    validateDeviceAttributeBlock(condition, "condition")
  }

  rule.actions.each { action ->
    validateActionBlock(action)
  }
}

private void validateDeviceAttributeBlock(block, String label) {
  if (!(block instanceof Map)) throw new IllegalArgumentException("Invalid ${label}")
  if (block.type != "device") throw new IllegalArgumentException("Only device ${label}s are supported")

  def device = findAllowedDevice(block.deviceId)
  if (!device) throw new IllegalArgumentException("Unauthorized ${label} device ${block.deviceId}")

  def attribute = "${block.attribute ?: ""}".trim()
  if (!attribute) throw new IllegalArgumentException("${label} attribute is required")

  if (!attributeAllowed(device, attribute)) {
    throw new IllegalArgumentException("Attribute not available on ${device.displayName}: ${attribute}")
  }

  def operator = "${block.operator ?: "eq"}".toLowerCase()
  if (!["eq", "neq", "gt", "gte", "lt", "lte", "contains"].contains(operator)) {
    throw new IllegalArgumentException("Unsupported operator: ${operator}")
  }
}

private void validateActionBlock(action) {
  if (!(action instanceof Map)) throw new IllegalArgumentException("Invalid action")

  if (action.type == "delay") {
    Integer seconds = safeInt(action.seconds, 0)
    if (seconds < 1 || seconds > 86400) throw new IllegalArgumentException("Invalid delay seconds")
    return
  }

  if (action.type != "deviceCommand") {
    throw new IllegalArgumentException("Unsupported action type: ${action.type}")
  }

  def device = findAllowedDevice(action.deviceId)
  if (!device) throw new IllegalArgumentException("Unauthorized action device ${action.deviceId}")

  String command = "${action.command ?: ""}".trim()
  if (!isCommandAllowed(device, command)) {
    throw new IllegalArgumentException("Command not allowed on ${device.displayName}: ${command}")
  }

  normalizeCommandArgs(command, action.args instanceof List ? action.args : [])
}

private Boolean attributeAllowed(device, String attribute) {
  def wanted = attribute.toLowerCase()
  return safeAttributes(device).collect { "${it}".toLowerCase() }.contains(wanted)
}

private List normalizeCommandArgs(String command, List rawArgs) {
  def args = rawArgs ?: []
  if (args.size() > 3) throw new IllegalArgumentException("Too many command args")

  if (command in ["on", "off"]) {
    if (!args.isEmpty()) throw new IllegalArgumentException("${command} does not accept args")
    return []
  }

  if (command == "setLevel") {
    Integer level = safeInt(args ? args[0] : null, -1)
    if (level < 0 || level > 100) throw new IllegalArgumentException("setLevel requires 0-100")
    return [level]
  }

  if (command == "setColorTemperature") {
    Integer kelvin = safeInt(args ? args[0] : null, -1)
    if (kelvin < 1500 || kelvin > 10000) throw new IllegalArgumentException("setColorTemperature requires 1500-10000")
    return [kelvin]
  }

  if (command in ["setHeatingSetpoint", "setCoolingSetpoint", "setThermostatSetpoint"]) {
    BigDecimal value = safeDecimal(args ? args[0] : null)
    if (value == null || value < 5 || value > 35) throw new IllegalArgumentException("${command} requires 5-35")
    return [value]
  }

  if (!args.isEmpty()) throw new IllegalArgumentException("${command} does not accept args in MVP")
  return []
}

private Boolean compareValues(current, String operator, expected) {
  def op = "${operator ?: "eq"}".toLowerCase()

  if (op in ["gt", "gte", "lt", "lte"]) {
    BigDecimal left = safeDecimal(current)
    BigDecimal right = safeDecimal(expected)
    if (left == null || right == null) return false
    if (op == "gt") return left > right
    if (op == "gte") return left >= right
    if (op == "lt") return left < right
    if (op == "lte") return left <= right
  }

  if (op == "neq") return "${current}" != "${expected}"
  if (op == "contains") return "${current}".contains("${expected}")
  return "${current}" == "${expected}"
}

private Boolean allowExecutionNow(String ruleId) {
  Long minute = Math.floor(now() / 60000L) as Long
  def bucket = state.executionRate instanceof Map ? state.executionRate : [:]
  def key = "${ruleId}:${minute}"
  Integer count = safeInt(bucket[key], 0)
  if (count >= 30) return false

  bucket[key] = count + 1
  state.executionRate = bucket.findAll { k, v -> "${k}".endsWith(":${minute}") }
  return true
}

private def findAllowedDevice(deviceId) {
  def id = "${deviceId ?: ""}".trim()
  if (!id) return null
  return allowedDevices().find { "${it.id}" == id }
}

private List allowedDevices() {
  return []
    .plus(selectedDevices("switchDevices"))
    .plus(selectedDevices("dimmerDevices"))
    .plus(selectedDevices("motionDevices"))
    .plus(selectedDevices("contactDevices"))
    .plus(selectedDevices("thermostatDevices"))
    .findAll { it != null }
    .unique { it.id }
}

private List selectedDevices(String key) {
  def value = settings?.get(key)
  if (!value) return []
  if (value instanceof List) return value.findAll { it != null }
  return [value]
}

private Boolean selectedDeviceContains(String key, device) {
  def id = "${device?.id ?: ""}"
  return selectedDevices(key).any { "${it.id}" == id }
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
  def out = [] as Set

  if (selectedDeviceContains("switchDevices", device)) out.addAll(["on", "off"])
  if (selectedDeviceContains("dimmerDevices", device)) out.addAll(["on", "off", "setLevel"])
  if (selectedDeviceContains("thermostatDevices", device)) {
    out.addAll(["setHeatingSetpoint", "setCoolingSetpoint", "setThermostatSetpoint"])
  }

  def normalizedCaps = safeCapabilities(device).collect { "${it}".toLowerCase().replaceAll(/\s+/, "") }
  if (normalizedCaps.contains("colortemperature")) out.add("setColorTemperature")

  return out as List
}

private Boolean isCommandAllowed(device, String command) {
  return allowedCommandsForDevice(device).contains(command)
}

private void cancelExecutionsForRule(String ruleId) {
  state.executions = getExecutionsMap().findAll { executionId, execution ->
    "${execution.ruleId}" != "${ruleId}"
  }
}

private Map getRulesMap() {
  return state.rules instanceof Map ? state.rules : [:]
}

private Map getExecutionsMap() {
  return state.executions instanceof Map ? state.executions : [:]
}

private def endpoint(Closure work) {
  try {
    return work.call()
  } catch (IllegalArgumentException e) {
    log.warn "Bad request: ${e.message}"
    return renderError(400, e.message)
  } catch (Exception e) {
    log.warn "Endpoint failed: ${e.message}"
    return renderError(500, e.message ?: "Internal error")
  }
}

private def readJsonBody() {
  try {
    if (request.JSON) return request.JSON
  } catch (ignored) {}

  try {
    def body = request?.body ?: "{}"
    return new JsonSlurper().parseText("${body}")
  } catch (ignored) {
    throw new IllegalArgumentException("Invalid JSON")
  }
}

private void rejectOversizedPayload(payload) {
  def size = JsonOutput.toJson(payload ?: [:]).size()
  if (size > 20000) throw new IllegalArgumentException("Rule payload too large")
}

private String ruleIdParam() {
  return "${params.ruleId ?: ""}".trim()
}

private String eventDeviceId(evt) {
  return "${evt?.deviceId ?: evt?.device?.id ?: ""}".trim()
}

private String sanitizeId(value) {
  return "${value ?: ""}".trim().replaceAll(/[^A-Za-z0-9_.:-]/, "_").take(80)
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

private def renderJson(payload, Integer statusCode = 200) {
  render status: statusCode, contentType: "application/json", data: JsonOutput.toJson(payload)
}

private def renderError(Integer statusCode, String message) {
  renderJson([ok: false, error: message], statusCode)
}

private void logInfo(String message) {
  if (settings?.enableInfoLogging != false) log.info message
}

private void logDebug(String message) {
  if (settings?.enableDebugLogging == true) log.debug message
}
