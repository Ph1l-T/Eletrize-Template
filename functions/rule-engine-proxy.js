import {
  CORS_HEADERS,
  getRuleEngineCredentials,
  jsonResponse,
  requireAuthenticatedUser,
  resolveUserAccessPolicy,
} from "./_auth.js";

const JSON_HEADERS = {
  ...CORS_HEADERS,
  "Content-Type": "application/json",
};

function normalizeRulePath(rawPath) {
  const path = String(rawPath || "").trim();
  if (!path || !path.startsWith("/")) return "";
  if (path.includes("..") || path.includes("//")) return "";

  const allowed = [
    /^\/ping$/,
    /^\/devices$/,
    /^\/rules$/,
    /^\/rules\/[A-Za-z0-9_.:-]+$/,
    /^\/rules\/[A-Za-z0-9_.:-]+\/run$/,
    /^\/rules\/[A-Za-z0-9_.:-]+\/enable$/,
    /^\/rules\/[A-Za-z0-9_.:-]+\/disable$/,
  ];

  return allowed.some((pattern) => pattern.test(path)) ? path : "";
}

function isMethodAllowed(path, method) {
  if (path === "/ping" || path === "/devices") return method === "GET";
  if (path === "/rules") return method === "GET" || method === "POST";
  if (/^\/rules\/[A-Za-z0-9_.:-]+$/.test(path)) {
    return method === "GET" || method === "PUT" || method === "DELETE";
  }
  if (/^\/rules\/[A-Za-z0-9_.:-]+\/(run|enable|disable)$/.test(path)) {
    return method === "POST";
  }
  return false;
}

function collectReferencedDeviceIds(rule) {
  const ids = new Set();
  const collect = (value) => {
    const id = String(value || "").trim();
    if (id) ids.add(id);
  };

  (Array.isArray(rule?.triggers) ? rule.triggers : []).forEach((trigger) => {
    if (trigger?.type === "device") collect(trigger.deviceId);
  });
  (Array.isArray(rule?.conditions) ? rule.conditions : []).forEach(
    (condition) => {
      if (condition?.type === "device") collect(condition.deviceId);
    },
  );
  (Array.isArray(rule?.actions) ? rule.actions : []).forEach((action) => {
    if (action?.type === "deviceCommand") collect(action.deviceId);
  });

  return Array.from(ids);
}

async function readJsonBody(request) {
  const text = await request.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

function validateRuleAccess(rule, accessPolicy) {
  if (!rule || typeof rule !== "object") {
    return {
      ok: false,
      response: jsonResponse({ error: "Invalid rule JSON" }, 400),
    };
  }

  if (accessPolicy.unrestricted) {
    return { ok: true };
  }

  const denied = collectReferencedDeviceIds(rule).filter(
    (deviceId) => !accessPolicy.controlDeviceIds.has(String(deviceId)),
  );

  if (denied.length > 0) {
    return {
      ok: false,
      response: jsonResponse(
        {
          error: "Access denied for one or more routine devices",
          devices: denied,
        },
        403,
      ),
    };
  }

  return { ok: true };
}

export async function onRequest(context) {
  const { request } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  const requestUrl = new URL(request.url);
  const path = normalizeRulePath(requestUrl.searchParams.get("path"));
  if (!path) {
    return jsonResponse({ error: "Invalid or missing rule engine path" }, 400);
  }

  const method = request.method.toUpperCase();
  if (!isMethodAllowed(path, method)) {
    return jsonResponse({ error: "Method not allowed for this path" }, 405);
  }

  const auth = await requireAuthenticatedUser(context);
  if (!auth.ok) {
    return auth.response;
  }

  const accessPolicy = await resolveUserAccessPolicy(context, auth);
  if (!accessPolicy.ok) {
    return accessPolicy.response;
  }

  const credentials = getRuleEngineCredentials(context.env);
  if (!credentials.ok) {
    return credentials.response;
  }

  let bodyText;
  if (method === "POST" || method === "PUT") {
    const body = await readJsonBody(request);
    if (!body) {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    if (path === "/rules" || /^\/rules\/[A-Za-z0-9_.:-]+$/.test(path)) {
      const access = validateRuleAccess(body, accessPolicy);
      if (!access.ok) return access.response;
    }

    bodyText = JSON.stringify(body);
  }

  const upstreamUrl = new URL(`${credentials.baseUrl}${path}`);
  upstreamUrl.searchParams.set("access_token", credentials.accessToken);

  try {
    const upstreamResponse = await fetch(upstreamUrl.toString(), {
      method,
      headers: {
        Accept: "application/json",
        ...(bodyText ? { "Content-Type": "application/json" } : {}),
      },
      body: bodyText,
    });

    const responseText = await upstreamResponse.text();
    return new Response(responseText || "{}", {
      status: upstreamResponse.status,
      headers: JSON_HEADERS,
    });
  } catch (error) {
    return jsonResponse(
      {
        error: "Rule engine proxy error",
        message: error?.message || "Unexpected proxy error",
      },
      502,
    );
  }
}
