import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import { markDriverOnline, markDriverOffline } from "../sockets";

const router = Router();

const onlineSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

router.post("/online", requireAuth, requireRole("driver"), async (req: Request, res: Response) => {
  const parsed = onlineSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } });
  }

  await markDriverOnline(req.user!.userId, parsed.data.lat, parsed.data.lng);
  res.status(200).json({ data: { ok: true } });
});

router.post("/offline", requireAuth, requireRole("driver"), async (req: Request, res: Response) => {
  await markDriverOffline(req.user!.userId);
  res.status(200).json({ data: { ok: true } });
});

export default router;
