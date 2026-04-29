/* eslint-disable no-console */
(function (global) {
  "use strict";

  const PROFILE_TABLE = "user_access_profiles";
  const ENV_ACCESS_TABLE = "user_environment_access";

  const state = {
    ready: false,
    unrestricted: true,
    profile: null,
    viewEnvKeys: new Set(),
    controlEnvKeys: new Set(),
    sceneEnvKeys: new Set(),
    viewDeviceIds: new Set(),
    controlDeviceIds: new Set(),
    lastError: "",
  };

  const readyResolvers = [];

  function normalizeValue(value) {
    return String(value || "")
      .trim()
      .toLowerCase();
  }

  function toArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function uniqueNormalized(values) {
    const output = [];
    const seen = new Set();
    toArray(values).forEach((value) => {
      const normalized = normalizeValue(value);
      if (!normalized || seen.has(normalized)) return;
      seen.add(normalized);
      output.push(normalized);
    });
    return output;
  }

  function resetState() {
    state.unrestricted = true;
    state.profile = null;
    state.viewEnvKeys = new Set();
    state.controlEnvKeys = new Set();
    state.sceneEnvKeys = new Set();
    state.viewDeviceIds = new Set();
    state.controlDeviceIds = new Set();
    state.lastError = "";
  }

  function snapshot() {
    return {
      ready: state.ready,
      unrestricted: state.unrestricted,
      profile: state.profile ? { ...state.profile } : null,
      viewEnvKeys: Array.from(state.viewEnvKeys),
      controlEnvKeys: Array.from(state.controlEnvKeys),
      sceneEnvKeys: Array.from(state.sceneEnvKeys),
      viewDeviceIds: Array.from(state.viewDeviceIds),
      controlDeviceIds: Array.from(state.controlDeviceIds),
      lastError: state.lastError,
    };
  }

  function resolveReady() {
    if (state.ready) return;
    state.ready = true;

    while (readyResolvers.length > 0) {
      const resolve = readyResolvers.shift();
      if (typeof resolve === "function") {
        resolve(snapshot());
      }
    }

    global.dispatchEvent(
      new CustomEvent("dashboard-access-ready", {
        detail: snapshot(),
      }),
    );
  }

  function waitUntilReady() {
    if (state.ready) {
      return Promise.resolve(snapshot());
    }

    return new Promise((resolve) => {
      readyResolvers.push(resolve);
    });
  }

  function getAuthApi() {
    return global.dashboardAuth || null;
  }

  function isAdminProfile(profile) {
    if (!profile || typeof profile !== "object") return false;
    if (profile.is_admin === true) return true;
    return normalizeValue(profile.role) === "admin";
  }

  function addDeviceId(setRef, value) {
    const normalized = normalizeValue(value);
    if (!normalized) return;
    setRef.add(normalized);
  }

  function collectEnvironmentDeviceIds(envKey) {
    const environments = global.CLIENT_CONFIG?.environments || {};
    const env = environments?.[envKey] || null;
    const ids = new Set();

    if (!env || typeof env !== "object") {
      return ids;
    }

    const registerEntryId = (entry) => {
      if (!entry || typeof entry !== "object") return;
      addDeviceId(ids, entry.id);
      addDeviceId(ids, entry.deviceId);
      addDeviceId(ids, entry.metadataDeviceId);
      addDeviceId(ids, entry.metadataId);
      addDeviceId(ids, entry.transportDeviceId);
      addDeviceId(ids, entry.transportId);
      addDeviceId(ids, entry.volumeDeviceId);
      addDeviceId(ids, entry.volumeId);
      addDeviceId(ids, entry.powerDeviceId);
      addDeviceId(ids, entry.powerId);

      if (Array.isArray(entry.targets)) {
        entry.targets.forEach((target) => {
          if (target && typeof target === "object") {
            addDeviceId(ids, target.id);
            addDeviceId(ids, target.deviceId);
            return;
          }
          addDeviceId(ids, target);
        });
      }
    };

    toArray(env.lights).forEach(registerEntryId);
    toArray(env.curtains).forEach(registerEntryId);
    [
      "tv",
      "htv",
      "bluray",
      "appletv",
      "clarotv",
      "music",
      "roku",
      "games",
      "hidromassagem",
    ].forEach((field) => {
      toArray(env[field]).forEach(registerEntryId);
    });

    const airConditioner = env.airConditioner || null;
    if (airConditioner && typeof airConditioner === "object") {
      addDeviceId(ids, airConditioner.deviceId);
      toArray(airConditioner.zones).forEach((zone) => {
        if (!zone || typeof zone !== "object") return;
        addDeviceId(ids, zone.deviceId);
      });
    }

    const initDevicesByEnv =
      global.CLIENT_CONFIG?.devices?.initializeDevicesByEnv || {};
    toArray(initDevicesByEnv?.[envKey]).forEach((deviceId) => {
      addDeviceId(ids, deviceId);
    });

    return ids;
  }

  async function fetchSingleProfile(client, userId) {
    const { data, error } = await client
      .from(PROFILE_TABLE)
      .select("user_id, role, display_name, is_admin")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data || null;
  }

  async function fetchEnvironmentAccessRows(client, userId) {
    const { data, error } = await client
      .from(ENV_ACCESS_TABLE)
      .select("environment_key, can_view, can_control, can_create_scenes")
      .eq("user_id", userId);

    if (error) {
      throw error;
    }

    return Array.isArray(data) ? data : [];
  }

  function applyRestrictedAccess(profile, rows) {
    state.unrestricted = false;
    state.profile = profile ? { ...profile } : null;
    state.viewEnvKeys = new Set();
    state.controlEnvKeys = new Set();
    state.sceneEnvKeys = new Set();
    state.viewDeviceIds = new Set();
    state.controlDeviceIds = new Set();

    rows.forEach((row) => {
      const envKey = normalizeValue(row?.environment_key);
      if (!envKey) return;

      const canControl = row?.can_control === true;
      const canView = row?.can_view === true || canControl;
      const canCreateScenes = row?.can_create_scenes === true;

      if (canView) {
        state.viewEnvKeys.add(envKey);
      }

      if (canControl) {
        state.controlEnvKeys.add(envKey);
      }

      if (canCreateScenes) {
        state.sceneEnvKeys.add(envKey);
      }

      const envDeviceIds = collectEnvironmentDeviceIds(envKey);
      envDeviceIds.forEach((deviceId) => {
        if (canView) {
          state.viewDeviceIds.add(deviceId);
        }
        if (canControl) {
          state.controlDeviceIds.add(deviceId);
        }
      });
    });
  }

  async function loadAccessState() {
    resetState();

    const authApi = getAuthApi();
    if (!authApi) {
      resolveReady();
      return;
    }

    try {
      if (typeof authApi.waitUntilReady === "function") {
        await authApi.waitUntilReady();
      }
    } catch (error) {
      state.lastError = error?.message || "auth-wait-failed";
      resolveReady();
      return;
    }

    const client =
      typeof authApi.getClient === "function" ? authApi.getClient() : null;
    const user =
      typeof authApi.getUser === "function" ? authApi.getUser() : null;
    const authEnabled =
      typeof authApi.isEnabled === "function" ? authApi.isEnabled() : false;

    if (!authEnabled || !client || !user?.id) {
      resolveReady();
      return;
    }

    try {
      const profile = await fetchSingleProfile(client, user.id);

      if (!profile) {
        state.profile = null;
        state.unrestricted = true;
        resolveReady();
        return;
      }

      if (isAdminProfile(profile)) {
        state.profile = { ...profile };
        state.unrestricted = true;
        resolveReady();
        return;
      }

      const rows = await fetchEnvironmentAccessRows(client, user.id);
      applyRestrictedAccess(profile, rows);
      resolveReady();
    } catch (error) {
      console.error("Falha ao carregar permissões de acesso:", error);
      state.lastError = error?.message || "access-load-failed";
      state.unrestricted = false;
      state.profile = state.profile || null;
      resolveReady();
    }
  }

  function hasAnyEnvironmentAccess(envKey) {
    const normalized = normalizeValue(envKey);
    if (!normalized) return false;
    if (state.unrestricted) return true;
    return (
      state.viewEnvKeys.has(normalized) ||
      state.controlEnvKeys.has(normalized) ||
      state.sceneEnvKeys.has(normalized)
    );
  }

  function canViewEnvironment(envKey) {
    const normalized = normalizeValue(envKey);
    if (!normalized) return false;
    if (state.unrestricted) return true;
    return (
      state.viewEnvKeys.has(normalized) || state.controlEnvKeys.has(normalized)
    );
  }

  function canControlEnvironment(envKey) {
    const normalized = normalizeValue(envKey);
    if (!normalized) return false;
    if (state.unrestricted) return true;
    return state.controlEnvKeys.has(normalized);
  }

  function canCreateScenesForEnvironment(envKey) {
    const normalized = normalizeValue(envKey);
    if (!normalized) return false;
    if (state.unrestricted) return true;
    return state.sceneEnvKeys.has(normalized);
  }

  function canCreateScenes() {
    if (state.unrestricted) return true;
    return state.sceneEnvKeys.size > 0;
  }

  function isAdmin() {
    return isAdminProfile(state.profile);
  }

  function canAccessAdminPanel() {
    return isAdmin();
  }

  function isDeviceAllowed(deviceId, purpose) {
    const normalizedDeviceId = normalizeValue(deviceId);
    if (!normalizedDeviceId) return false;
    if (state.unrestricted) return true;

    const normalizedPurpose = normalizeValue(purpose || "view");
    if (normalizedPurpose === "control") {
      return state.controlDeviceIds.has(normalizedDeviceId);
    }

    return (
      state.viewDeviceIds.has(normalizedDeviceId) ||
      state.controlDeviceIds.has(normalizedDeviceId)
    );
  }

  function getAllowedEnvironmentKeys(purpose) {
    if (state.unrestricted) {
      return uniqueNormalized(
        Object.keys(global.CLIENT_CONFIG?.environments || {}),
      );
    }

    const normalizedPurpose = normalizeValue(purpose || "view");
    if (normalizedPurpose === "control") {
      return Array.from(state.controlEnvKeys);
    }
    if (normalizedPurpose === "scenes") {
      return Array.from(state.sceneEnvKeys);
    }

    return uniqueNormalized([
      ...Array.from(state.viewEnvKeys),
      ...Array.from(state.controlEnvKeys),
    ]);
  }

  function canUseRoute(route) {
    const normalizedRoute = normalizeValue(route);
    if (!normalizedRoute) return true;

    if (state.unrestricted) return true;

    if (normalizedRoute === "home" || normalizedRoute === "ambientes") {
      return getAllowedEnvironmentKeys("view").length > 0;
    }

    if (normalizedRoute === "curtains" || normalizedRoute === "cortinas") {
      return getAllowedEnvironmentKeys("view").length > 0;
    }

    if (normalizedRoute === "scenes" || normalizedRoute === "scenes-criar") {
      return canCreateScenes();
    }

    const envMatch = normalizedRoute.match(
      /^(ambiente\d+)(?:-(luzes|cortinas|conforto|musica|tv|htv|bluray|appletv|clarotv|roku|games|hidromassagem))?$/,
    );
    if (!envMatch) {
      return true;
    }

    const envKey = envMatch[1];
    const subpage = envMatch[2] || "";

    if (!subpage) {
      return canViewEnvironment(envKey);
    }

    return canControlEnvironment(envKey);
  }

  function resolveAccessibleRoute(route) {
    const requested = normalizeValue(route || "home") || "home";
    if (canUseRoute(requested)) {
      return requested;
    }

    const preferredFallbacks = ["home", "ambientes", "curtains", "scenes"];
    const fallback = preferredFallbacks.find((candidate) =>
      canUseRoute(candidate),
    );
    if (fallback) {
      return fallback;
    }

    const firstEnvironment = getAllowedEnvironmentKeys("view")[0];
    if (firstEnvironment) {
      return firstEnvironment;
    }

    return requested;
  }

  function filterNavItems(items) {
    if (!Array.isArray(items)) return [];
    return items.filter((item) => {
      if (item?.adminOnly === true) {
        return canAccessAdminPanel();
      }
      return canUseRoute(item?.path || item?.id || "");
    });
  }

  function publishApi() {
    global.dashboardAccess = {
      isReady() {
        return state.ready;
      },
      canInitializeApp() {
        return state.ready;
      },
      waitUntilReady,
      isUnrestricted() {
        return state.unrestricted;
      },
      isAdmin,
      canAccessAdminPanel,
      getProfile() {
        return state.profile ? { ...state.profile } : null;
      },
      getAllowedEnvironmentKeys,
      hasAnyEnvironmentAccess,
      canViewEnvironment,
      canControlEnvironment,
      canCreateScenes,
      canCreateScenesForEnvironment,
      isDeviceAllowed,
      canUseRoute,
      resolveAccessibleRoute,
      filterNavItems,
      getSnapshot() {
        return snapshot();
      },
    };
  }

  publishApi();

  global.addEventListener("dashboard-authenticated", () => {
    state.ready = false;
    loadAccessState().catch((error) => {
      console.error("Falha ao recarregar permissoes apos autenticacao:", error);
      if (!state.ready) {
        resolveReady();
      }
    });
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      loadAccessState().catch((error) => {
        console.error("Falha ao inicializar controle de acesso:", error);
        if (!state.ready) {
          resolveReady();
        }
      });
    });
  } else {
    loadAccessState().catch((error) => {
      console.error("Falha ao inicializar controle de acesso:", error);
      if (!state.ready) {
        resolveReady();
      }
    });
  }
})(window);
