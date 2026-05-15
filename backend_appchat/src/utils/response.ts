import type { Response } from "express";

export const sendResponse = (
  res: Response,
  statusCode: number,
  message: string,
  data: any = null
) => {
  return res.status(statusCode).json({
    success: statusCode >= 200 && statusCode < 300,
    message,
    data,
  });
};

export const sendError = (
  res: Response,
  statusCode: number,
  message: string,
  errors: any = null
) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};
