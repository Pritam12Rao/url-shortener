import Url from "../models/url.model";
import { nanoid } from "nanoid";
import { Request, Response } from "express";
import validator from "validator";
import Analytics from "../models/analytics.model";
import geoip from "geoip-lite";

export const createShortUrl = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { originalUrl } = req.body;

    if (!originalUrl) {
      res.status(400).json({ message: "Original URL is required" });
      return;
    }

    if (!validator.isURL(originalUrl, { require_protocol: true })) {
      res.status(400).json({ message: "Invalid URL format" });
      return;
    }

    const existingUrl = await Url.findOne({ originalUrl });

    if (existingUrl) {
      const baseUrl = `${req.protocol}://${req.get("host")}`;

      res.status(200).json({
        message: "Short URL already exists",
        shortUrl: `${baseUrl}/${existingUrl.shortCode}`,
      });

      return;
    }

    let shortCode = nanoid(7);

    let shortCodeExists = await Url.findOne({ shortCode });

    while (shortCodeExists) {
      shortCode = nanoid(7);
      shortCodeExists = await Url.findOne({ shortCode });
    }

    const newUrl = await Url.create({
      originalUrl,
      shortCode,
    });

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    res.status(201).json({
      message: "Short URL created successfully",
      shortUrl: `${baseUrl}/${newUrl.shortCode}`,
    });
  } catch (error) {
    console.error("Error creating short URL:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

//Redirect logic with analytics capture
export const redirectToOriginalUrl = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { shortCode } = req.params;

    if (typeof shortCode !== "string") {
      res.status(400).json({ message: "Invalid short code" });
      return;
    }

    const url = await Url.findOneAndUpdate(
      { shortCode },
      { $inc: { clicks: 1 } },
      { new: true },
    );

    if (!url) {
      res.status(404).json({ message: "Short URL not found" });
      return;
    }

    //capture analytics data
    const ip = req.ip || "Unknown";
    const userAgent =
      typeof req.headers["user-agent"] === "string"
        ? req.headers["user-agent"]
        : "Unknown";

    const geo = ip !== "Unknown" ? geoip.lookup(ip) : null;
    const country = geo ? geo.country : "Unknown";

    await Analytics.create({
        shortCode,
        ip,
        country,
        userAgent
    })
        
    res.redirect(url.originalUrl);
  } catch (error) {
    console.error("Redirect error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
