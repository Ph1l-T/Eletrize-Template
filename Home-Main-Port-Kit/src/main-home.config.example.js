// Exemplo de bootstrap do mÃ³dulo Main Home.
// Ajuste os adapters para o seu app.

const runtime = window.MainHomeKit.createMainHomeRuntime({
  config: {
    weather: {
      city: "Ribeirao Preto",
      latitude: -21.1775,
      longitude: -47.8103,
      timezone: "auto",
      refreshMinutes: 15,
    },
    mainDashboard: {
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
          unmute: "unmute",
        },
      },
      previewNowPlaying: {
        enabled: true,
        status: "playing",
        track: "Blinding Lights",
        artist: "The Weeknd",
        album: "After Hours",
        artwork: "assets/images/music-placeholder.png",
        muted: false,
      },
    },
  },
  adapters: {
    getStoredState(deviceId) {
      return localStorage.getItem(`deviceState:${deviceId}`);
    },
    setStoredState(deviceId, state) {
      localStorage.setItem(`deviceState:${deviceId}`, state);
    },
    async sendCommand(deviceId, command, value) {
      const params = new URLSearchParams({
        device: String(deviceId),
        command: String(command),
      });
      if (value !== undefined && value !== null) {
        params.set("value", String(value));
      }
      const response = await fetch(`/hubitat-proxy?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`sendCommand HTTP ${response.status}`);
      }
    },
    async pollDevice(deviceId) {
      const response = await fetch(`/polling?devices=${encodeURIComponent(deviceId)}`);
      if (!response.ok) {
        throw new Error(`pollDevice HTTP ${response.status}`);
      }
      return response.json();
    },
    navigate(route) {
      window.location.hash = `#${route}`;
    },
    getVisibleEnvironments() {
      return [];
    },
    getEnvironmentPhotoMap() {
      return {};
    },
  },
});

runtime.init();


