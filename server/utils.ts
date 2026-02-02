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
  const userId = req.header("x-user-id");
  if (!userId) {
    const error = new Error("Missing x-user-id header.");
    (error as Error & { status?: number }).status = 400;
    throw error;
  }
  return userId;
};
