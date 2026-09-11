import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// AI Offer Generator from Text
app.post("/api/ai-generate-offer", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: "Geçerli bir metin girişi gereklidir." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY tanımlanmamış." });
    }

    const prompt = `Sen profesyonel bir inşaat mühendisi, mimar ve kentsel dönüşüm uzmanısın.
Aşağıda kullanıcının serbest metin olarak girdiği inşaat/proje teklif talebi bulunmaktadır. Bu metni analiz ederek, inşaat hesaplama ve resmi teklif parametrelerine uygun bir JSON objesi üret.

Kullanıcı Metni:
"""
${text}
"""

Lütfen şu anahtarları içeren geçerli bir JSON objesi döndür (Markdown blokları olmadan, sadece ham JSON):
{
  "projectName": "Proje veya Müşteri Adı",
  "projectAddress": "Proje Adresi / Konumu",
  "landArea": sayı (m2),
  "baseBuildArea": sayı (m2 taban),
  "floorCount": sayı (zemin üstü kat),
  "flatsPerFloor": sayı (daire/kat),
  "hasGroundFloorShop": boolean,
  "shopCount": sayı,
  "basementCount": sayı,
  "basementPurpose": "shelter_depot" | "parking" | "shop" | "commercial_shop",
  "basementShopCount": sayı,
  "buildingType": "standard" | "luxury" | "commercial",
  "quality": "standard" | "luxury" | "premium",
  "projectModel": "cash" | "contractorShare",
  "contractorShareRate": sayı,
  "transformationStatus": "currentSupport" | "futureSupport2027" | "none",
  "additionalOfferClauses": [
    "özel maddeler veya talepler"
  ]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const responseText = response.text || "{}";
    let jsonStr = responseText.trim();
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    const parsedData = JSON.parse(jsonStr);
    res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error("AI Offer Generation Error:", error);
    res.status(500).json({ error: error.message || "Yapay zeka teklif oluşturma sırasında hata oluştu." });
  }
});

// Vite & Static file handling
async function startServer() {
  const isCjsBundle = typeof __filename !== "undefined" && __filename.endsWith(".cjs");
  const isProd = process.env.NODE_ENV === "production" || isCjsBundle;

  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

