import {
  CORS_HEADERS,
  jsonResponse,
  requireAuthenticatedUser,
  resolveUserAccessPolicy,
} from "./_auth.js";

/**
 * Cloudflare Function: session-bootstrap
 * Aquece cache de autenticacao/politica para reduzir latencia no primeiro comando.
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

  return jsonResponse(
    {
      success: true,
      unrestricted: accessPolicy.unrestricted === true,
      profileRole: accessPolicy.profile?.role || null,
      allowedEnvironmentCount:
        accessPolicy.unrestricted === true
          ? null
          : accessPolicy.viewEnvironmentKeys.size,
      timestamp: new Date().toISOString(),
    },
    200,
  );
}
