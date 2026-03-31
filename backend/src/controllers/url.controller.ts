import Url from "../models/url.model";
import { nanoid } from "nanoid";
import { Request, Response } from "express";
import validator from "validator";
import Analytics from "../models/analytics.model";
import geoip from "geoip-lite";
import redisClient from "../config/redis";

export const createShortUrl = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { originalUrl, customCode, expiresAt } = req.body;

    if (!originalUrl) {
      res.status(400).json({ message: "Original URL is required" });
      return;
    }

    if (!validator.isURL(originalUrl, { require_protocol: true })) {
      res.status(400).json({ message: "Invalid URL format" });
      return;
    }

    // 🔥 Validate expiresAt
    let expiryDate: Date | undefined;

    if (expiresAt) {
      const parsedDate = new Date(expiresAt);

      if (isNaN(parsedDate.getTime())) {
        res.status(400).json({ message: "Invalid expiration date" });
        return;
      }

      if (parsedDate <= new Date()) {
        res.status(400).json({ message: "Expiration must be in the future" });
        return;
      }

      expiryDate = parsedDate;
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

    let shortCode: string;

    // 🔥 Custom code logic
    if (customCode) {
      const existing = await Url.findOne({ shortCode: customCode });

      if (existing) {
        res.status(400).json({ message: "Custom code already in use" });
        return;
      }

      shortCode = customCode;
    } else {
      // 🔥 nanoid with collision handling
      shortCode = nanoid(7);

      let shortCodeExists = await Url.findOne({ shortCode });

      while (shortCodeExists) {
        shortCode = nanoid(7);
        shortCodeExists = await Url.findOne({ shortCode });
      }
    }

    const newUrl = await Url.create({
      originalUrl,
      shortCode,
      expiresAt: expiryDate,
    });

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    res.status(201).json({
      message: "Short URL created successfully",
      shortUrl: `${baseUrl}/${newUrl.shortCode}`,
      expiresAt: expiryDate || null,
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

    // 🔥 Always fetch minimal data to check expiry
    const urlData = await Url.findOne({ shortCode });

    if (!urlData) {
      res.status(404).json({ message: "Short URL not found" });
      return;
    }

    // 🔥 Expiry check FIRST (before cache, analytics, clicks)
    if (urlData.expiresAt && urlData.expiresAt < new Date()) {
      res.status(410).json({ message: "This link has expired" });
      return;
    }

    // 🔥 Check Redis cache
    const cachedUrl = await redisClient.get(shortCode);

    if (cachedUrl) {
      console.log("Cache HIT");

      // increment clicks
      await Url.updateOne({ shortCode }, { $inc: { clicks: 1 } });

      // analytics
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
        userAgent,
      });

      res.redirect(cachedUrl);
      return;
    }

    // 🔥 Cache MISS
    console.log("Cache MISS");

    // increment clicks + get updated doc
    const url = await Url.findOneAndUpdate(
      { shortCode },
      { $inc: { clicks: 1 } },
      { new: true },
    );

    if (!url) {
      res.status(404).json({ message: "Short URL not found" });
      return;
    }

    // store in Redis
    await redisClient.set(shortCode, url.originalUrl);

    // analytics
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
      userAgent,
    });

    res.redirect(url.originalUrl);
  } catch (error) {
    console.error("Redirect error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getUrlAnalytics = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { shortCode } = req.params;

    if (typeof shortCode !== "string") {
      res.status(400).json({ message: "Invalid short code" });
      return;
    }

    const totalClicks = await Analytics.countDocuments({ shortCode });

    const topCountries = await Analytics.aggregate([
      { $match: { shortCode } },
      {
        $group: {
          _id: "$country",
          clicks: { $sum: 1 },
        },
      },
      { $sort: { clicks: -1 } },
      { $limit: 5 },
    ]);

    const formattedCountries = topCountries.map((item) => ({
      country: item._id,
      clicks: item.clicks,
    }));

    const recentClicks = await Analytics.find({ shortCode })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("ip country userAgent createdAt");

    

    res.status(200).json({
      shortCode,
      totalClicks,
      topCountries: formattedCountries,
      recentClicks,
    });
  } catch (error) {
    console.error("Analytics fetch error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
