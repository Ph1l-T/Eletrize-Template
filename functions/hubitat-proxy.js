import {
  CORS_HEADERS,
  getHubitatCredentials,
  jsonResponse,
  requireAuthenticatedUser,
  resolveUserAccessPolicy,
} from "./_auth.js";

/**
 * Cloudflare Function: hubitat-proxy
 * Proxy para Maker API do Hubitat (resolve CORS e protege credenciais)
 */
export async function onRequest(context) {
  const { request } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
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

  const url = new URL(request.url);
  const deviceId = url.searchParams.get("device");
  const command = url.searchParams.get("command");
  const value = url.searchParams.get("value");

  if (!deviceId) {
    return jsonResponse({ error: "Missing device parameter" }, 400);
  }

  if (
    !accessPolicy.unrestricted &&
    !accessPolicy.controlDeviceIds.has(String(deviceId).trim())
  ) {
    return jsonResponse(
      {
        error: "Access denied for this device",
        device: String(deviceId),
      },
      403,
    );
  }

  try {
    let hubitatUrl = `${hubitatBaseUrl}/devices/${deviceId}`;

    if (command) {
      hubitatUrl += `/${command}`;
      if (value) {
        hubitatUrl += `/${value}`;
      }
    }

    hubitatUrl += `?access_token=${hubitatAccessToken}`;

    const hubitatResponse = await fetch(hubitatUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const responseText = await hubitatResponse.text();

    return new Response(responseText, {
      status: hubitatResponse.status,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return jsonResponse(
      {
        error: "Proxy error",
        message: error.message,
      },
      500
    );
  }
}

