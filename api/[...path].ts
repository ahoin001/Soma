import app from "../server/app";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}
