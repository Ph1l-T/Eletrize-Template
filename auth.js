(function () {
  const AUTH_GATE_CLASS = "auth-locked";
  const PROTECTED_PATHS = new Set([
    "/polling",
    "/hubitat-proxy",
    "/session-bootstrap",
  ]);

  const state = {
    enabled: false,
    ready: false,
    authenticated: false,
    accessToken: "",
    user: null,
    client: null,
    allowEmailSignUp: false,
    allowGoogleLogin: true,
    requireEmailConfirmation: true,
    redirectTo: "",
  };

  const dom = {
    gate: null,
    form: null,
    email: null,
    password: null,
    signInBtn: null,
    signUpBtn: null,
    googleBtn: null,
    status: null,
  };

  const readyResolvers = [];
  const authenticatedListeners = new Set();
  const originalFetch =
    typeof window.fetch === "function" ? window.fetch.bind(window) : null;

  function resolveAuthConfig() {
    try {
      if (typeof window.getAuthConfig === "function") {
        return window.getAuthConfig() || {};
      }
    } catch (error) {
      // noop
    }

    return window.CLIENT_CONFIG?.auth || {};
  }

  function normalizeRedirectTarget(redirectTo) {
    if (!redirectTo) {
      return `${window.location.origin}${window.location.pathname}`;
    }

    try {
      return new URL(redirectTo, window.location.origin).toString();
    } catch (error) {
      return `${window.location.origin}${window.location.pathname}`;
    }
  }

  function setStatus(message, type) {
    if (!dom.status) return;
    dom.status.textContent = message || "";
    dom.status.dataset.state = type || "neutral";
  }

  function setBusy(isBusy) {
    const buttons = [dom.signInBtn, dom.signUpBtn, dom.googleBtn].filter(
      Boolean,
    );
    buttons.forEach((button) => {
      button.disabled = Boolean(isBusy);
    });
  }

  function setGateLocked(locked) {
    const shouldLock = Boolean(locked);
    document.body.classList.toggle(AUTH_GATE_CLASS, shouldLock);

    if (dom.gate) {
      dom.gate.hidden = !shouldLock;
    }
  }

  function resolveRequestUrl(input) {
    try {
      if (input instanceof Request) {
        return new URL(input.url, window.location.origin);
      }

      if (typeof input === "string" || input instanceof URL) {
        return new URL(input, window.location.origin);
      }
    } catch (error) {
      return null;
    }

    return null;
  }

  function shouldAttachAuthHeader(input) {
    if (!state.enabled) return false;

    const resolved = resolveRequestUrl(input);
    if (!resolved) return false;
    if (resolved.origin !== window.location.origin) return false;

    return PROTECTED_PATHS.has(resolved.pathname);
  }

  function resolveReady() {
    if (state.ready) return;

    state.ready = true;
    while (readyResolvers.length > 0) {
      const resolver = readyResolvers.shift();
      if (typeof resolver === "function") {
        resolver();
      }
    }

    window.dispatchEvent(new CustomEvent("dashboard-auth-ready"));
  }

  function waitUntilReady() {
    if (state.ready) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      readyResolvers.push(resolve);
    });
  }

  function notifyAuthenticated() {
    window.dispatchEvent(
      new CustomEvent("dashboard-authenticated", {
        detail: {
          user: state.user,
        },
      }),
    );

    authenticatedListeners.forEach((listener) => {
      try {
        listener(state.user);
      } catch (error) {
        console.error("Erro ao notificar listener de auth:", error);
      }
    });
  }

  function restorePendingHash() {
    try {
      const storedHash =
        localStorage.getItem("dashboard_auth_return_hash") || "";
      if (storedHash && !window.location.hash) {
        window.location.hash = storedHash;
      }
      localStorage.removeItem("dashboard_auth_return_hash");
    } catch (error) {
      // noop
    }
  }

  function isEmailConfirmed(user) {
    if (!user) return false;
    return Boolean(user.email_confirmed_at || user.confirmed_at);
  }

  async function applySession(session) {
    const previousAuthenticated = state.authenticated;
    const previousAccessToken = state.accessToken;

    state.accessToken = session?.access_token || "";
    state.user = session?.user || null;

    if (
      state.requireEmailConfirmation &&
      state.user &&
      !isEmailConfirmed(state.user)
    ) {
      await state.client.auth.signOut();
      state.accessToken = "";
      state.user = null;
      state.authenticated = false;
      setGateLocked(true);
      setStatus("Confirme seu email antes de entrar no dashboard.", "error");
      return;
    }

    state.authenticated = Boolean(state.accessToken && state.user?.email);

    if (state.authenticated) {
      setGateLocked(false);
      setStatus("", "neutral");
      restorePendingHash();
      if (!previousAuthenticated || previousAccessToken !== state.accessToken) {
        warmSessionAccessCache().catch(() => {});
      }
      if (!previousAuthenticated) {
        notifyAuthenticated();
      }
      return;
    }

    setGateLocked(true);
    if (!state.ready) {
      setStatus("", "neutral");
    }
  }

  async function loadSession() {
    const { data, error } = await state.client.auth.getSession();
    if (error) {
      throw error;
    }
    await applySession(data?.session || null);
  }

  async function warmSessionAccessCache() {
    if (!state.enabled || !state.authenticated) return;

    try {
      await fetch("/session-bootstrap", {
        method: "GET",
        cache: "no-store",
      });
    } catch (error) {
      console.warn("Falha ao aquecer sessao de acesso:", error);
    }
  }

  async function handleEmailSignIn(event) {
    event.preventDefault();

    const email = dom.email?.value?.trim();
    const password = dom.password?.value || "";

    if (!email || !password) {
      setStatus("Informe email e senha.", "error");
      return;
    }

    setBusy(true);
    setStatus("Entrando...", "neutral");

    try {
      const { error } = await state.client.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      setStatus("Login realizado com sucesso.", "success");
    } catch (error) {
      setStatus(error?.message || "Falha ao entrar.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleEmailSignUp() {
    if (!state.allowEmailSignUp) {
      setStatus("Cadastro de email/senha desativado.", "error");
      return;
    }

    const email = dom.email?.value?.trim();
    const password = dom.password?.value || "";

    if (!email || !password) {
      setStatus("Informe email e senha para criar conta.", "error");
      return;
    }

    setBusy(true);
    setStatus("Criando conta...", "neutral");

    try {
      const { data, error } = await state.client.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: state.redirectTo,
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.session) {
        setStatus(
          "Conta criada. Verifique seu email para confirmar o acesso.",
          "success",
        );
      } else {
        setStatus("Conta criada e autenticada.", "success");
      }
    } catch (error) {
      setStatus(error?.message || "Falha ao criar conta.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleSignIn() {
    if (!state.allowGoogleLogin) {
      setStatus("Login com Google desativado.", "error");
      return;
    }

    setBusy(true);
    setStatus("Redirecionando para o Google...", "neutral");

    try {
      localStorage.setItem(
        "dashboard_auth_return_hash",
        window.location.hash || "#home",
      );
    } catch (error) {
      // noop
    }

    const { error } = await state.client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: state.redirectTo,
      },
    });

    if (error) {
      setStatus(error.message || "Falha no login Google.", "error");
      setBusy(false);
    }
  }

  async function signOut() {
    if (!state.client) return;

    await state.client.auth.signOut();
    state.accessToken = "";
    state.user = null;
    state.authenticated = false;
    setGateLocked(true);
    setStatus("Sessão encerrada.", "neutral");
    window.location.reload();
  }

  function bindDom() {
    dom.gate = document.getElementById("auth-gate");
    dom.form = document.getElementById("auth-email-form");
    dom.email = document.getElementById("auth-email");
    dom.password = document.getElementById("auth-password");
    dom.signInBtn = document.getElementById("auth-signin-btn");
    dom.signUpBtn = document.getElementById("auth-signup-btn");
    dom.googleBtn = document.getElementById("auth-google-btn");
    dom.status = document.getElementById("auth-status");

    if (dom.signUpBtn) {
      dom.signUpBtn.hidden = !state.allowEmailSignUp;
    }

    if (dom.googleBtn) {
      dom.googleBtn.hidden = !state.allowGoogleLogin;
    }

    if (dom.form) {
      dom.form.addEventListener("submit", handleEmailSignIn);
    }

    if (dom.signUpBtn) {
      dom.signUpBtn.addEventListener("click", handleEmailSignUp);
    }

    if (dom.googleBtn) {
      dom.googleBtn.addEventListener("click", handleGoogleSignIn);
    }
  }

  function publishApi() {
    window.dashboardAuth = {
      isEnabled: function () {
        return state.enabled;
      },
      isReady: function () {
        return state.ready;
      },
      isAuthenticated: function () {
        return state.authenticated;
      },
      canInitializeApp: function () {
        return !state.enabled || state.authenticated;
      },
      getAccessToken: function () {
        return state.accessToken || "";
      },
      getClient: function () {
        return state.client;
      },
      getUser: function () {
        return state.user;
      },
      waitUntilReady,
      signOut,
      onAuthenticated: function (callback) {
        if (typeof callback !== "function") {
          return function () {};
        }

        authenticatedListeners.add(callback);

        if (state.authenticated) {
          try {
            callback(state.user);
          } catch (error) {
            console.error("Erro no callback de auth:", error);
          }
        }

        return function unsubscribe() {
          authenticatedListeners.delete(callback);
        };
      },
    };
  }

  function installFetchInterceptor() {
    if (!originalFetch) return;

    window.fetch = async function patchedFetch(input, init) {
      if (!shouldAttachAuthHeader(input)) {
        return originalFetch(input, init);
      }

      await waitUntilReady();

      if (!state.accessToken) {
        return new Response(
          JSON.stringify({ error: "Authentication required" }),
          {
            status: 401,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
      }

      const headers = new Headers(
        init?.headers || (input instanceof Request ? input.headers : undefined),
      );
      headers.set("Authorization", `Bearer ${state.accessToken}`);

      return originalFetch(input, {
        ...(init || {}),
        headers,
      });
    };
  }

  async function bootstrapAuth() {
    const cfg = resolveAuthConfig();

    state.enabled = cfg.enabled === true;
    state.allowEmailSignUp = cfg.allowEmailSignUp === true;
    state.allowGoogleLogin = cfg.allowGoogleLogin !== false;
    state.requireEmailConfirmation = cfg.requireEmailConfirmation !== false;
    state.redirectTo = normalizeRedirectTarget(cfg.redirectTo);

    publishApi();

    if (!state.enabled) {
      state.authenticated = true;
      resolveReady();
      return;
    }

    bindDom();
    setGateLocked(true);

    if (!window.supabase?.createClient) {
      setStatus(
        "Biblioteca de login indisponível. Recarregue a página.",
        "error",
      );
      resolveReady();
      return;
    }

    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
      setStatus(
        "Configuração de login incompleta. Defina auth.supabaseUrl e auth.supabaseAnonKey.",
        "error",
      );
      resolveReady();
      return;
    }

    try {
      state.client = window.supabase.createClient(
        cfg.supabaseUrl,
        cfg.supabaseAnonKey,
        {
          auth: {
            detectSessionInUrl: true,
            persistSession: true,
            autoRefreshToken: true,
          },
        },
      );

      state.client.auth.onAuthStateChange(async (_event, session) => {
        await applySession(session || null);
      });

      await loadSession();
      resolveReady();

      if (!state.authenticated) {
        setStatus("", "neutral");
      }
    } catch (error) {
      setStatus(error?.message || "Falha ao inicializar login.", "error");
      resolveReady();
    }
  }

  installFetchInterceptor();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      bootstrapAuth().catch((error) => {
        console.error("Erro no bootstrap de autenticação:", error);
      });
    });
  } else {
    bootstrapAuth().catch((error) => {
      console.error("Erro no bootstrap de autenticação:", error);
    });
  }
})();
