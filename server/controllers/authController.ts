import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { login as loginModel } from "../models/authModel";


const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export async function login(req: Request, res: Response) {
  const { username, password } = req.body;
  const result = await loginModel(username, password);
  if (result.success) {
    const token = jwt.sign(
      {
        userId: result.user.id,
        role: result.user.role,
        tenantId: result.user.tenantId,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    return res.json({ ...result, token });
  }
  if (result.status) {
    return res.status(result.status).json({ success: false, message: result.message });
  }
  return res.status(401).json({ success: false, message: "Invalid credentials" });
}
