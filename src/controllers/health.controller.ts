import type { Request, Response } from "express";

export function getLiveness(_req: Request, res: Response): void {
  res.status(200).json({ status: "ok" });
}

export function getReadiness(_req: Request, res: Response): void {
  res.status(200).json({ status: "ok" });
}
