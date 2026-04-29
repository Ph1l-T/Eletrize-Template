# Dashboard Eletrize - AI Coding Instructions

## Project Overview

This is a **PWA smart home dashboard** for Hubitat home automation systems. It's a client-customizable template deployed on Cloudflare Pages with serverless Functions for API proxying.

**Key insight**: The project is a white-label template. Most customizations happen in `config.js` while `index.html` contains the full SPA UI (5000+ lines, single-file architecture).

## Architecture

```
Frontend (SPA)           Cloudflare Functions          Hubitat
index.html + script.js → /functions/hubitat-proxy.js → Maker API
                       → /functions/polling.js
```

- **config.js**: Central configuration hub - environments, devices, icons, Maker API credentials
- **script.js**: Core control logic (~7600 lines) - device communication, state management, UI updates
- **scenes.js**: Automation scenarios - coordinates multiple device actions
- **functions/**: Cloudflare Workers that proxy Hubitat API (solves CORS, hides credentials)

## Critical Patterns

### Device Configuration (config.js)
All devices are defined in `CLIENT_CONFIG.environments`:
```javascript
ambiente1: {
  name: "Home Theater",
  lights: [{ id: "96", name: "Painel", type: "dimmer", defaultLevel: 60 }],
  curtains: [{ id: "109", name: "Todas" }],
  airConditioner: { zones: [{ id: "varanda", deviceId: "110" }] },
  tv: [{ id: "111", name: "Televisão" }]
}
```

### Icon System
Icons are centralized in `ui.items` and `ui.toggles` in config.js. Use `data-ui-item` attributes for automatic icon/label binding:
```html
<div data-ui-item="lights">...</div>  <!-- Gets icon from config -->
```
Override any icon globally via `ui.iconOverrides` map.

### API Communication
Never call Hubitat directly from frontend. Use the proxy:
```javascript
// Correct: uses /functions/hubitat-proxy.js
await sendHubitatCommand(deviceId, "on");

// For polling multiple devices
await pollDevices([deviceId1, deviceId2, ...]);
```

### State Management
Devices use `data-device-id` and `data-state` attributes:
```html
<div class="control-card" data-device-id="96" data-state="off">
```
`script.js` updates these via `updateDeviceUI()` after polling.

## Development Commands

```bash
npm run dev          # Start local server on port 3000
npm run dev:auto     # Auto-select available port
```

For production, deploy via Cloudflare Pages (auto-deploys on git push).

## Key Files to Modify

| Task | File(s) |
|------|---------|
| Add/edit rooms & devices | `config.js` → `environments` |
| Custom scenarios | `scenes.js` |
| Branding (logo, colors) | `images/icons/Eletrize.svg`, `images/pwa/`, `styles.css` |
| PWA metadata | `manifest.json`, `index.html` `<title>` |
| Hubitat credentials | `config.js` → `makerApi.cloud` |

## Conventions

- **Portuguese**: All user-facing labels are in Brazilian Portuguese
- **Environment naming**: Use `ambiente1`, `ambiente2`, etc. as keys
- **Device IDs**: Always strings (e.g., `"96"`, not `96`)
- **Photos**: Place in `images/Images/`, reference by filename in config: `photo: "photo-sala.webp"`
- **Icons**: SVG only, stored in `images/icons/`

## Common Gotchas

1. **Curtain commands may be inverted** for some hardware - check `script.js` line ~1122 for device-specific mappings
2. **Encoding issues**: The app has auto-correction for UTF-8 problems (see `script.js` ~line 717)
3. **Debug mode**: Enable with `window.__DASHBOARD_DEBUG__ = true` in console
4. **Service Worker caching**: Use `clear-cache.html` or increment version in `styles.css?v=X.X.X` and `config.js?v=X.X.X`

## Testing Device Changes

After modifying `config.js`, verify in browser console:
```javascript
CLIENT_CONFIG.environments.ambiente1.lights  // Check device array
getEnvironmentLightIds("ambiente1")          // Test helper functions
```
