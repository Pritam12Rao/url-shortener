import express from "express";
import { Request, Response } from "express";
import urlRoutes from "./routes/url.routes";
import Url from "./models/url.models";
import { redirectToOriginalUrl } from "./controllers/url.controller";

const app = express();
app.use(express.json());

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api", urlRoutes);

app.get("/:shortCode", redirectToOriginalUrl);

export default app;
