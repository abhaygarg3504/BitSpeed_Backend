import type { Request, Response } from "express";
import { identifyContact } from "../services/identityService.js";
import type { IdentifyRequest } from "../types.js";

export async function identify(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as IdentifyRequest;

    const email = body.email ?? null;
    const phoneNumber = body.phoneNumber ? String(body.phoneNumber) : null;

    if (!email && !phoneNumber) {
      res.status(400).json({
        error: "Bad Request",
        message: "At least one of 'email' or 'phoneNumber' must be provided.",
      });
      return;
    }

    const result = await identifyContact({ email, phoneNumber });
    res.status(200).json(result);
  } catch (error) {
    console.error("[IdentifyController] Error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Something went wrong while processing your request.",
    });
  }
}
