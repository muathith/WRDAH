import type { Express } from "express";
import { createServer, type Server } from "http";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/vehicles/:nin", async (req, res) => {
    const { nin } = req.params;

    if (!nin || !/^\d{10}$/.test(nin)) {
      return res.status(400).json({ success: false, message: "Invalid NIN" });
    }

    try {
      const response = await fetch(
        `https://bcare.com.sa/InquiryApi/api/InquiryNew/getVehiclesByNin?Nin=${encodeURIComponent(
          nin
        )}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json, text/plain, */*",
            "Accept-Language": "ar-SA",
            Authorization: "Bearer 0.35989928665161711!!",
            Channel: "mobile",
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();
      const inner = data?.data || data;

      if (inner?.ErrorCode && inner.ErrorCode !== 0) {
        return res.json({
          success: false,
          message: inner.ErrorDescription || "API error",
          errorCode: inner.ErrorCode,
          vehicles: [],
        });
      }

      const result = inner?.Result;
      const vehicles = Array.isArray(result) ? result : result ? [result] : [];

      return res.json({
        success: true,
        vehicles,
      });
    } catch (error: any) {
      console.error("bcare API error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to connect to bcare API",
        vehicles: [],
      });
    }
  });

  return httpServer;
}
