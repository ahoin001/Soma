import type { NextFunction, Request, RequestHandler, Response } from "express";

type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>;

export const asyncHandler =
  (handler: AsyncHandler): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };

export const getUserId = (req: Request) => {
  const authId = (req as Request & { userId?: string }).userId;
  const headerId = req.header("x-user-id");
  const userId = authId ?? headerId;
  if (!userId) {
    const error = new Error("Unauthorized.");
    (error as Error & { status?: number }).status = 401;
    throw error;
  }
  return userId;
};
