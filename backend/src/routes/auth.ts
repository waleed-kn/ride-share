import { Router, Request, Response } from "express";
import { signupSchema, loginSchema } from "../utils/validation";
import { signup, login, AuthError, getUserById } from "../services/authService";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/signup", async (req: Request, res: Response) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } });
  }

  try {
    const { token, user } = await signup(parsed.data);
    res.status(201).json({ data: { token, user } });
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(409).json({ error: { code: "AUTH_ERROR", message: err.message } });
    }
    console.error("Signup error:", err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } });
  }

  try {
    const { token, user } = await login(parsed.data);
    res.status(200).json({ data: { token, user } });
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(401).json({ error: { code: "AUTH_ERROR", message: err.message } });
    }
    console.error("Login error:", err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } });
  }
});

router.get("/me", requireAuth, async (req: Request, res: Response) => {
  const user = await getUserById(req.user!.userId);
  if (!user) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "User not found" } });
  }
  res.status(200).json({ data: { user } });
});

export default router;
