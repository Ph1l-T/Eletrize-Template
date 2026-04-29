const DEFAULT_HUBITAT_BASE_URL = "";
const DEFAULT_HUBITAT_ACCESS_TOKEN = "";

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Max-Age": "86400",
};

const DEFAULT_AUTH_VALIDATION_CACHE_TTL_SECONDS = 60 * 60 * 6;
const DEFAULT_ACCESS_POLICY_CACHE_TTL_SECONDS = 60 * 60 * 6;
const MIN_CACHE_TTL_SECONDS = 5;

const authValidationCache = new Map();
const accessPolicyCache = new Map();

function normalizeCsv(rawValue) {
  return String(rawValue || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function parsePositiveInt(rawValue, fallbackValue) {
  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed < MIN_CACHE_TTL_SECONDS) {
    return fallbackValue;
  }
  return parsed;
}

function decodeJwtPayload(accessToken) {
  const token = String(accessToken || "").trim();
  const payloadSegment = token.split(".")[1] || "";
  if (!payloadSegment) return null;

  try {
    const normalized = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = atob(padded);
    return JSON.parse(decoded);
  } catch (error) {
    return null;
  }
}

function getTokenExpirationMs(accessToken) {
  const payload = decodeJwtPayload(accessToken);
  const expSeconds = Number(payload?.exp);
  if (!Number.isFinite(expSeconds) || expSeconds <= 0) {
    return 0;
  }
  return expSeconds * 1000;
}

function resolveCacheExpiryMs(accessToken, ttlMs) {
  const now = Date.now();
  const ttlExpiry = now + Math.max(1000, Number(ttlMs) || 1000);
  const tokenExpiry = getTokenExpirationMs(accessToken);

  if (tokenExpiry > now) {
    return Math.min(ttlExpiry, tokenExpiry);
  }

  return ttlExpiry;
}

function pruneExpiredEntries(cacheMap) {
  const now = Date.now();
  for (const [key, entry] of cacheMap.entries()) {
    if (!entry || Number(entry.expiresAt || 0) <= now) {
      cacheMap.delete(key);
    }
  }
}

function getCachedEntry(cacheMap, cacheKey) {
  if (!cacheKey) return null;

  const entry = cacheMap.get(cacheKey);
  if (!entry) return null;

  if (Number(entry.expiresAt || 0) <= Date.now()) {
    cacheMap.delete(cacheKey);
    return null;
  }

  return entry;
}

function cloneUser(user) {
  if (!user || typeof user !== "object") return null;
  return { ...user };
}

function cloneProfile(profile) {
  if (!profile || typeof profile !== "object") return null;
  return { ...profile };
}

function toPolicyCacheEntry(policy, userId, expiresAt) {
  return {
    userId: String(userId || "").trim(),
    expiresAt,
    unrestricted: policy.unrestricted === true,
    profile: cloneProfile(policy.profile),
    viewDeviceIds: Array.from(policy.viewDeviceIds || []),
    controlDeviceIds: Array.from(policy.controlDeviceIds || []),
    viewEnvironmentKeys: Array.from(policy.viewEnvironmentKeys || []),
    controlEnvironmentKeys: Array.from(policy.controlEnvironmentKeys || []),
    sceneEnvironmentKeys: Array.from(policy.sceneEnvironmentKeys || []),
  };
}

function fromPolicyCacheEntry(entry) {
  return {
    ok: true,
    unrestricted: entry.unrestricted === true,
    profile: cloneProfile(entry.profile),
    viewDeviceIds: new Set(entry.viewDeviceIds || []),
    controlDeviceIds: new Set(entry.controlDeviceIds || []),
    viewEnvironmentKeys: new Set(entry.viewEnvironmentKeys || []),
    controlEnvironmentKeys: new Set(entry.controlEnvironmentKeys || []),
    sceneEnvironmentKeys: new Set(entry.sceneEnvironmentKeys || []),
  };
}

function cacheAuthValidation(accessToken, user, env) {
  const ttlSeconds = parsePositiveInt(
    env?.AUTH_VALIDATION_CACHE_TTL_SECONDS,
    DEFAULT_AUTH_VALIDATION_CACHE_TTL_SECONDS,
  );
  const ttlMs = ttlSeconds * 1000;

  authValidationCache.set(accessToken, {
    expiresAt: resolveCacheExpiryMs(accessToken, ttlMs),
    user: cloneUser(user),
  });
}

function cacheAccessPolicy(accessToken, userId, policy, env) {
  const ttlSeconds = parsePositiveInt(
    env?.ACCESS_POLICY_CACHE_TTL_SECONDS,
    DEFAULT_ACCESS_POLICY_CACHE_TTL_SECONDS,
  );
  const ttlMs = ttlSeconds * 1000;

  accessPolicyCache.set(
    accessToken,
    toPolicyCacheEntry(
      policy,
      userId,
      resolveCacheExpiryMs(accessToken, ttlMs),
    ),
  );
}

function isFlagEnabled(rawValue, defaultValue) {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return defaultValue;
  }

  const normalized = String(rawValue).trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;

  return defaultValue;
}

export function jsonResponse(payload, status) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
  });
}

export function getHubitatCredentials(env) {
  const hubitatBaseUrl = String(
    env?.HUBITAT_BASE_URL || DEFAULT_HUBITAT_BASE_URL,
  ).trim();
  const hubitatAccessToken = String(
    env?.HUBITAT_ACCESS_TOKEN || DEFAULT_HUBITAT_ACCESS_TOKEN,
  ).trim();

  if (!hubitatBaseUrl || !hubitatAccessToken) {
    return {
      ok: false,
      response: jsonResponse(
        {
          error: "Hubitat credentials are not configured",
        },
        500,
      ),
    };
  }

  return {
    ok: true,
    baseUrl: hubitatBaseUrl.replace(/\/$/, ""),
    accessToken: hubitatAccessToken,
  };
}

export function getRuleEngineCredentials(env) {
  const baseUrl = String(
    env?.RULE_ENGINE_BASE_URL ||
      env?.HUBITAT_RULE_ENGINE_BASE_URL ||
      "",
  ).trim();
  const accessToken = String(
    env?.RULE_ENGINE_ACCESS_TOKEN ||
      env?.HUBITAT_RULE_ENGINE_ACCESS_TOKEN ||
      "",
  ).trim();

  if (!baseUrl || !accessToken) {
    return {
      ok: false,
      response: jsonResponse(
        {
          error: "Rule engine credentials are not configured",
        },
        500,
      ),
    };
  }

  return {
    ok: true,
    baseUrl: baseUrl.replace(/\/$/, ""),
    accessToken,
  };
}

function isAuthEnabled(env) {
  const forcedFlag = env?.AUTH_ENABLED;

  if (forcedFlag !== undefined && forcedFlag !== null && forcedFlag !== "") {
    return isFlagEnabled(forcedFlag, false);
  }

  return Boolean(env?.SUPABASE_URL && env?.SUPABASE_ANON_KEY);
}

function getBearerToken(request) {
  const authHeader = request.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function isUserAllowedByEmail(email, env) {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  if (!normalizedEmail) return false;

  const allowlistedEmails = normalizeCsv(env?.ALLOWED_EMAILS);
  const allowlistedDomains = normalizeCsv(env?.ALLOWED_EMAIL_DOMAINS).map(
    (domain) => domain.replace(/^@/, ""),
  );

  if (allowlistedEmails.length === 0 && allowlistedDomains.length === 0) {
    return true;
  }

  if (allowlistedEmails.includes(normalizedEmail)) {
    return true;
  }

  const emailDomain = normalizedEmail.split("@")[1] || "";
  if (!emailDomain) return false;

  return allowlistedDomains.includes(emailDomain);
}

async function getSupabaseUserFromToken(accessToken, env) {
  const supabaseUrl = String(env?.SUPABASE_URL || "")
    .trim()
    .replace(/\/$/, "");
  const supabaseAnonKey = String(env?.SUPABASE_ANON_KEY || "").trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      ok: false,
      status: 500,
      payload: {
        error: "Supabase auth is not configured on server",
      },
    };
  }

  const endpoint = `${supabaseUrl}/auth/v1/user`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseAnonKey,
    },
  });

  if (!response.ok) {
    return {
      ok: false,
      status: 401,
      payload: {
        error: "Invalid or expired auth token",
      },
    };
  }

  const user = await response.json();
  return {
    ok: true,
    user,
  };
}

function getSupabaseRestConfig(env) {
  const supabaseUrl = String(env?.SUPABASE_URL || "")
    .trim()
    .replace(/\/$/, "");
  const supabaseAnonKey = String(env?.SUPABASE_ANON_KEY || "").trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
  };
}

function buildSupabaseHeaders(accessToken, anonKey) {
  return {
    Authorization: `Bearer ${accessToken}`,
    apikey: anonKey,
    Accept: "application/json",
  };
}

async function fetchSupabaseRows(tableName, queryParams, accessToken, env) {
  const restConfig = getSupabaseRestConfig(env);
  if (!restConfig) {
    throw new Error("Supabase REST is not configured on server");
  }

  const url = new URL(`${restConfig.supabaseUrl}/rest/v1/${tableName}`);
  Object.entries(queryParams || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, String(value));
  });

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: buildSupabaseHeaders(accessToken, restConfig.supabaseAnonKey),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Supabase query failed for ${tableName} (${response.status}): ${text}`,
    );
  }

  const payload = await response.json();
  return Array.isArray(payload) ? payload : [];
}

function normalizeAccessValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function buildInFilter(values) {
  const normalized = Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => normalizeAccessValue(value))
        .filter(Boolean),
    ),
  );

  if (normalized.length === 0) {
    return "";
  }

  return `in.(${normalized.map((value) => `"${value}"`).join(",")})`;
}

async function fetchUserAccessProfile(userId, accessToken, env) {
  const rows = await fetchSupabaseRows(
    "user_access_profiles",
    {
      select: "user_id,role,display_name,is_admin",
      user_id: `eq.${userId}`,
    },
    accessToken,
    env,
  );

  return rows[0] || null;
}

async function fetchUserEnvironmentAccess(userId, accessToken, env) {
  return fetchSupabaseRows(
    "user_environment_access",
    {
      select: "environment_key,can_view,can_control,can_create_scenes",
      user_id: `eq.${userId}`,
    },
    accessToken,
    env,
  );
}

async function fetchEnvironmentDeviceRegistry(
  environmentKeys,
  accessToken,
  env,
) {
  const inFilter = buildInFilter(environmentKeys);
  if (!inFilter) return [];

  return fetchSupabaseRows(
    "environment_device_registry",
    {
      select: "environment_key,device_id",
      environment_key: inFilter,
    },
    accessToken,
    env,
  );
}

function isAdminProfile(profile) {
  if (!profile || typeof profile !== "object") return false;
  if (profile.is_admin === true) return true;
  return normalizeAccessValue(profile.role) === "admin";
}

export function isExplicitAdminProfile(profile) {
  return isAdminProfile(profile);
}

export async function resolveUserAccessPolicy(context, authResult) {
  if (!authResult?.ok) {
    return {
      ok: false,
      response: jsonResponse({ error: "Authentication required" }, 401),
    };
  }

  if (
    authResult.authSkipped ||
    !authResult.user?.id ||
    !authResult.accessToken
  ) {
    return {
      ok: true,
      unrestricted: true,
      profile: null,
      viewDeviceIds: new Set(),
      controlDeviceIds: new Set(),
      viewEnvironmentKeys: new Set(),
      controlEnvironmentKeys: new Set(),
      sceneEnvironmentKeys: new Set(),
    };
  }

  pruneExpiredEntries(accessPolicyCache);
  const cachedPolicy = getCachedEntry(
    accessPolicyCache,
    authResult.accessToken,
  );
  if (cachedPolicy && cachedPolicy.userId === String(authResult.user.id)) {
    return fromPolicyCacheEntry(cachedPolicy);
  }

  try {
    const profile = await fetchUserAccessProfile(
      authResult.user.id,
      authResult.accessToken,
      context.env,
    );

    if (!profile || isAdminProfile(profile)) {
      const policy = {
        ok: true,
        unrestricted: true,
        profile: profile || null,
        viewDeviceIds: new Set(),
        controlDeviceIds: new Set(),
        viewEnvironmentKeys: new Set(),
        controlEnvironmentKeys: new Set(),
        sceneEnvironmentKeys: new Set(),
      };

      cacheAccessPolicy(
        authResult.accessToken,
        authResult.user.id,
        policy,
        context.env,
      );

      return policy;
    }

    const rows = await fetchUserEnvironmentAccess(
      authResult.user.id,
      authResult.accessToken,
      context.env,
    );

    const viewEnvironmentKeys = new Set();
    const controlEnvironmentKeys = new Set();
    const sceneEnvironmentKeys = new Set();

    rows.forEach((row) => {
      const envKey = normalizeAccessValue(row?.environment_key);
      if (!envKey) return;

      const canControl = row?.can_control === true;
      const canView = row?.can_view === true || canControl;
      const canCreateScenes = row?.can_create_scenes === true;

      if (canView) {
        viewEnvironmentKeys.add(envKey);
      }
      if (canControl) {
        controlEnvironmentKeys.add(envKey);
      }
      if (canCreateScenes) {
        sceneEnvironmentKeys.add(envKey);
      }
    });

    const registryRows = await fetchEnvironmentDeviceRegistry(
      Array.from(
        new Set([
          ...Array.from(viewEnvironmentKeys),
          ...Array.from(controlEnvironmentKeys),
        ]),
      ),
      authResult.accessToken,
      context.env,
    );

    const viewDeviceIds = new Set();
    const controlDeviceIds = new Set();

    registryRows.forEach((row) => {
      const envKey = normalizeAccessValue(row?.environment_key);
      const deviceId = String(row?.device_id || "").trim();
      if (!envKey || !deviceId) return;

      if (
        viewEnvironmentKeys.has(envKey) ||
        controlEnvironmentKeys.has(envKey)
      ) {
        viewDeviceIds.add(deviceId);
      }
      if (controlEnvironmentKeys.has(envKey)) {
        controlDeviceIds.add(deviceId);
      }
    });

    const policy = {
      ok: true,
      unrestricted: false,
      profile,
      viewDeviceIds,
      controlDeviceIds,
      viewEnvironmentKeys,
      controlEnvironmentKeys,
      sceneEnvironmentKeys,
    };

    cacheAccessPolicy(
      authResult.accessToken,
      authResult.user.id,
      policy,
      context.env,
    );

    return policy;
  } catch (error) {
    return {
      ok: false,
      response: jsonResponse(
        {
          error: "Failed to resolve access policy",
          message: error?.message || "Unexpected access control error",
        },
        500,
      ),
    };
  }
}

export async function requireAuthenticatedUser(context) {
  const { request, env } = context;

  if (!isAuthEnabled(env)) {
    return {
      ok: true,
      authSkipped: true,
      user: null,
      accessToken: "",
    };
  }

  const accessToken = getBearerToken(request);
  if (!accessToken) {
    return {
      ok: false,
      response: jsonResponse(
        {
          error: "Authentication required",
        },
        401,
      ),
    };
  }

  pruneExpiredEntries(authValidationCache);
  const cachedAuth = getCachedEntry(authValidationCache, accessToken);
  if (cachedAuth) {
    return {
      ok: true,
      authSkipped: false,
      user: cloneUser(cachedAuth.user),
      accessToken,
    };
  }

  try {
    const supabaseResult = await getSupabaseUserFromToken(accessToken, env);
    if (!supabaseResult.ok) {
      return {
        ok: false,
        response: jsonResponse(supabaseResult.payload, supabaseResult.status),
      };
    }

    const user = supabaseResult.user;
    const email = String(user?.email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return {
        ok: false,
        response: jsonResponse(
          {
            error: "Authenticated user does not include email",
          },
          403,
        ),
      };
    }

    const requireVerifiedEmail = isFlagEnabled(
      env?.REQUIRE_EMAIL_VERIFIED,
      true,
    );
    if (requireVerifiedEmail && !user?.email_confirmed_at) {
      return {
        ok: false,
        response: jsonResponse(
          {
            error: "Email not verified",
          },
          403,
        ),
      };
    }

    if (!isUserAllowedByEmail(email, env)) {
      return {
        ok: false,
        response: jsonResponse(
          {
            error: "Email is not allowlisted",
          },
          403,
        ),
      };
    }

    cacheAuthValidation(accessToken, user, env);

    return {
      ok: true,
      authSkipped: false,
      user,
      accessToken,
    };
  } catch (error) {
    return {
      ok: false,
      response: jsonResponse(
        {
          error: "Auth validation failed",
          message: error?.message || "Unexpected auth error",
        },
        500,
      ),
    };
  }
}

export async function requireAdminUser(context) {
  const auth = await requireAuthenticatedUser(context);
  if (!auth.ok) {
    return auth;
  }

  if (auth.authSkipped || !auth.user?.id || !auth.accessToken) {
    return {
      ok: false,
      response: jsonResponse(
        {
          error: "Admin authentication required",
        },
        403,
      ),
    };
  }

  try {
    const profile = await fetchUserAccessProfile(
      auth.user.id,
      auth.accessToken,
      context.env,
    );

    if (!isAdminProfile(profile)) {
      return {
        ok: false,
        response: jsonResponse(
          {
            error: "Admin access required",
          },
          403,
        ),
      };
    }

    return {
      ok: true,
      auth,
      profile,
    };
  } catch (error) {
    return {
      ok: false,
      response: jsonResponse(
        {
          error: "Admin validation failed",
          message: error?.message || "Unexpected admin validation error",
        },
        500,
      ),
    };
  }
}

