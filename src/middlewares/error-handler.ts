import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/index";

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    req.log.warn({ err }, err.message);
    res.status(err.statusCode).json({ error: { message: err.message } });
    return;
  }

  req.log.error({ err }, "Erro não tratado");
  res.status(500).json({ error: { message: "Erro interno do servidor" } });
}
