import type { NextFunction, Request, Response } from "express";
import { NotFoundError } from "../errors/index";

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError(`Rota não encontrada: ${req.method} ${req.path}`));
}
