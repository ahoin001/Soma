import app from "../server/app";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Ensure req.url starts with /api so Express route matching works.
 * Vercel's catch-all can pass the path without the /api prefix, or path may be in query.
 */
function ensureApiPath(req: VercelRequest): void {
  let path = "";
  let query = "";
  const raw = req.url ?? "";
  const [pathPart, queryPart] = raw.split("?");
  path = (pathPart ?? "").trim();
  query = queryPart ? `?${queryPart}` : "";

  // If path doesn't start with /api, fix it (Vercel can pass path without /api)
  if (path.length > 0 && !path.startsWith("/api")) {
    const withApi = path.startsWith("/") ? `/api${path}` : `/api/${path}`;
    (req as { url?: string }).url = withApi + query;
    return;
  }

  // Path param from catch-all [...path] (e.g. "workouts/exercise-media") — build url if missing
  const pathParam = req.query?.path;
  if ((!path || path === "/api") && pathParam) {
    const segment = Array.isArray(pathParam) ? pathParam.join("/") : String(pathParam);
    const withApi = `/api/${segment}${query}`;
    (req as { url?: string }).url = withApi;
  }
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  ensureApiPath(req);
  return app(req, res);
}
