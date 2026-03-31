import express from "express";
import { Request, Response } from "express";
import urlRoutes from "./routes/url.routes";
import Url from "./models/url.model";
import { redirectToOriginalUrl } from "./controllers/url.controller";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth.route";


const app = express();
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max requests per IP
  message: {
    message: "Too many requests, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api", limiter);

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api", urlRoutes);

app.get("/:shortCode", redirectToOriginalUrl);

export default app;
