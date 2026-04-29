import {
  CORS_HEADERS,
  getHubitatCredentials,
  jsonResponse,
  requireAuthenticatedUser,
  resolveUserAccessPolicy,
} from "./_auth.js";

/**
 * Cloudflare Function: polling
 * Busca estados de múltiplos dispositivos do Hubitat
 */
export async function onRequest(context) {
  const { request } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  const url = new URL(request.url);
  const devicesParam = url.searchParams.get("devices");
  const healthCheck = url.searchParams.get("health");

  if (healthCheck) {
    return jsonResponse({ status: "ok" }, 200);
  }

  const auth = await requireAuthenticatedUser(context);
  if (!auth.ok) {
    return auth.response;
  }

  const accessPolicy = await resolveUserAccessPolicy(context, auth);
  if (!accessPolicy.ok) {
    return accessPolicy.response;
  }

  const hubitatCredentials = getHubitatCredentials(context.env);
  if (!hubitatCredentials.ok) {
    return hubitatCredentials.response;
  }

  const { baseUrl: hubitatBaseUrl, accessToken: hubitatAccessToken } =
    hubitatCredentials;

  if (!devicesParam) {
    return jsonResponse({ error: "Missing devices parameter" }, 400);
  }

  try {
    const hubitatUrl = `${hubitatBaseUrl}/devices/all?access_token=${hubitatAccessToken}`;

    const hubitatResponse = await fetch(hubitatUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!hubitatResponse.ok) {
      throw new Error(`Hubitat API error: ${hubitatResponse.status}`);
    }

    const allDevices = await hubitatResponse.json();

    const requestedIds = devicesParam
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    const allowedRequestedIds = accessPolicy.unrestricted
      ? requestedIds
      : requestedIds.filter((id) => accessPolicy.viewDeviceIds.has(id));
    const devices = {};

    if (!allowedRequestedIds.length) {
      return jsonResponse(
        {
          success: true,
          devices: {},
          filtered: true,
          timestamp: new Date().toISOString(),
        },
        200,
      );
    }

    allDevices.forEach((device) => {
      const deviceId = String(device.id);
      if (!allowedRequestedIds.includes(deviceId)) return;

      let state = "off";
      let level = null;
      let volume = null;

      if (Array.isArray(device.attributes)) {
        const switchAttr = device.attributes.find((attr) => attr.name === "switch");
        if (switchAttr) {
          state = switchAttr.currentValue || switchAttr.value || state;
        }

        const levelAttr = device.attributes.find((attr) => attr.name === "level");
        if (levelAttr) {
          level = levelAttr.currentValue ?? levelAttr.value ?? level;
        }

        const volumeAttr = device.attributes.find((attr) => attr.name === "volume");
        if (volumeAttr) {
          volume = volumeAttr.currentValue ?? volumeAttr.value ?? volume;
        }
      } else if (device.attributes && typeof device.attributes === "object") {
        if (device.attributes.switch !== undefined) {
          state = device.attributes.switch;
        }
        if (device.attributes.level !== undefined) {
          level = device.attributes.level;
        }
        if (device.attributes.volume !== undefined) {
          volume = device.attributes.volume;
        }
      }

      devices[deviceId] = {
        success: true,
        state,
      };

      if (level !== null && level !== undefined) {
        devices[deviceId].level = level;
      }

      if (volume !== null && volume !== undefined) {
        devices[deviceId].volume = volume;
      }
    });

    return jsonResponse(
      {
        success: true,
        devices,
        timestamp: new Date().toISOString(),
      },
      200
    );
  } catch (error) {
    return jsonResponse(
      {
        error: "Polling error",
        message: error.message,
      },
      500
    );
  }
}


