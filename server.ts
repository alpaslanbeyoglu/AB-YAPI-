import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Lazy GoogleGenAI client helper
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY ortam değişkeni tanımlı değil. Lütfen Ayarlar > Secrets panellerinden ekleyin.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// System instruction for Kentsel Dönüşüm AI Expert
const SYSTEM_INSTRUCTION = `
Sen Türkiye kentsel dönüşüm, imar mevzuatı, inşaat maliyet analizi ve gayrimenkul geliştirme konularında uzmanlaşmış yüksek seviye bir Yapay Zeka Mimari ve Finansal Danışmansın (AB Yapı AI Uzmanı).
Görevin:
- Kullanıcının kentsel dönüşüm projesine ait teknik ve finansal parametreleri (arsa alanı, bina oturumu, kat sayısı, daire sayısı, dükkan durumu, müteahhit paylaşım oranı, toplam inşaat maliyeti, daire başı maliyet, çıkma ve çatı detayları) derinlemesine analiz etmek.
- Projenin finansal fizibilitesini değerlendirmek (Karlılık, Müteahhit Payı Dengesi, Hak Sahipleri Memnuniyeti, Risk Faktörleri).
- İmar yönetmelikleri (Otopark, Asansör, Çıkma / Konsol Kuralları, Çatı Dubleksi, Sığınak vb.) ışığında yapıcı ve uygulanabilir öneriler sunmak.
- Türkçe dilinde, son derece profesyonel, net, güven veren, maddeli ve anlaşılır bir üslup kullanmak.
- Markdown biçimlendirmesi (kalın yazılar, liste maddeleri, tablolar) kullanarak okunabilirliği maksimum seviyede tutmak.
`;

// Helper function for generateContent with model fallbacks and retries (503 handling)
async function generateContentWithRetry(
  ai: GoogleGenAI,
  options: {
    contents: string;
    systemInstruction?: string;
    temperature?: number;
  }
): Promise<string> {
  const modelsToTry = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.1-flash-lite"];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: options.contents,
        config: {
          systemInstruction: options.systemInstruction,
          temperature: options.temperature ?? 0.7,
        },
      });
      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`Model ${model} call failed, trying next fallback model:`, err?.message || err);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw lastError || new Error("Yapay zeka servisleri geçici olarak yanıt vermiyor. Lütfen tekrar deneyiniz.");
}

// Helper function for chat messaging with model fallbacks and retries
async function sendChatMessageWithRetry(
  ai: GoogleGenAI,
  options: {
    history: Array<{ role: string; parts: Array<{ text: string }> }>;
    message: string;
    systemInstruction?: string;
    temperature?: number;
  }
): Promise<string> {
  const modelsToTry = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.1-flash-lite"];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const chat = ai.chats.create({
        model,
        config: {
          systemInstruction: options.systemInstruction,
          temperature: options.temperature ?? 0.7,
        },
        history: options.history,
      });

      const response = await chat.sendMessage({
        message: options.message,
      });

      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`Chat model ${model} call failed, trying next fallback model:`, err?.message || err);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw lastError || new Error("Yapay zeka sohbet servisi geçici olarak yanıt vermiyor. Lütfen tekrar deneyiniz.");
}

// AI Proje Analiz Endpoint
app.post("/api/ai/analyze", async (req, res) => {
  try {
    const { params, results } = req.body;
    if (!params || !results) {
      return res.status(400).json({ error: "Eksik proje parametreleri." });
    }

    const ai = getAiClient();

    const prompt = `
Aşağıdaki Kentsel Dönüşüm Proje Verilerini Analiz Et ve Kapsamlı Bir Fizibilite & Strateji Raporu Hazırla:

--- PROJE YAPI PARAMETRELERİ ---
- Arsa Alanı: ${params.landArea || 0} m²
- Taban İnşaat Alanı (Bina Oturumu): ${params.baseBuildArea || 0} m²
- Kat Sayısı: ${params.floorCount || 5} Kat
- Katta Daire Sayısı: ${params.flatsPerFloor || 2} Daire
- Toplam Bağımsız Bölüm (Daire): ${results.flatCount || params.flatCount || 0} Adet
- Dükkan Durumu: ${params.hasGroundFloorShop ? `Var (${params.shopCount || 1} Adet Zemin Dükkan)` : 'Yok'}
- Çatı Modeli: ${params.roofType === 'duplex' ? 'Çatı Dubleksi' : params.roofType === 'mansard' ? 'Mansart Çatı' : 'Kırma Çatı'}
- Konsol / Çıkma: ${params.hasCantilever ? `Var (${params.cantileverDepth || 1.2}m - Yön: ${params.cantileverDirection})` : 'Yok'}
- Proje Modeli: ${params.projectModel === 'contractorShare' ? `Müteahhit Paylaşımlı (%${params.contractorShareRate || 50} Müteahhit / %${100 - (params.contractorShareRate || 50)} Hak Sahibi)` : 'Nakit Nakit Ücret Karşılığı'}

--- FİNANSAL VE MALİYET VERİLERİ ---
- Toplam Brüt İnşaat Alanı: ${results.totalConstructionArea || 0} m²
- Toplam Tahmini İnşaat Maliyeti: ${(results.grandTotal || 0).toLocaleString('tr-TR')} TL
- m² Birim İnşaat Maliyeti: ${(results.costPerSqm || 0).toLocaleString('tr-TR')} TL/m²
- Daire Başına Düşen Ortalama İnşaat Maliyeti: ${(results.costPerFlat || 0).toLocaleString('tr-TR')} TL/Daire
- Bölge Rayiç Daire Satış Fiyatı: ${(params.marketPricePerFlat || 0).toLocaleString('tr-TR')} TL

Lütfen şu 4 ana başlık altında detaylı bir değerlendirme sun:
1. 📊 **Genel Fizibilite ve Finansal Değerlendirme** (Karlılık durumu, maliyet yükü, piyasa rayiçlerine göre projenin cazibesi)
2. ⚖️ **Müteahhit & Hak Sahibi Paylaşım Dengesi** (Paylaşım oranının adilliği, arsa payı karlılığı)
3. 🏗️ **Mimari ve İmar Optimizasyonu** (Kat sayısı, çıkmalar, dükkan kullanımı ve çatı modelinin verimliliği)
4. 🚀 **3 Somut İyileştirme Önerisi** (Maliyeti düşürecek veya karlılığı/yaşam kalitesini artıracak aksiyonlar)
`;

    const analysisText = await generateContentWithRetry(ai, {
      contents: prompt,
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
    });

    res.json({ analysis: analysisText });
  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    let errorMsg = error.message || "Yapay zeka analizi sırasında bir hata oluştu.";
    if (errorMsg.includes("503") || errorMsg.includes("UNAVAILABLE") || errorMsg.includes("high demand")) {
      errorMsg = "Yapay zeka servisi şu anda yüksek yoğunluk yaşıyor (503). Sistem otomatik olarak tekrar denedi ancak servis geçici olarak meşgul. Lütfen birkaç saniye sonra tekrar 'Şimdi Analiz Et' butonuna tıklayınız.";
    }
    res.status(500).json({ error: errorMsg });
  }
});

// AI Chat Endpoint
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { messages, projectContext } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Geçersiz sohbet verisi." });
    }

    const ai = getAiClient();

    const formattedHistory = messages.slice(0, -1).map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    const lastUserMessage = messages[messages.length - 1].content;

    const contextPrompt = projectContext
      ? `[Mevcut Proje Özeti: Arsa ${projectContext.landArea}m², ${projectContext.floorCount} Kat, ${projectContext.flatCount} Daire, Toplam Maliyet ${projectContext.grandTotal} TL, Paylaşım %${projectContext.contractorShareRate} Müteahhit]\n\nKullanıcı Sorusu: ${lastUserMessage}`
      : lastUserMessage;

    const replyText = await sendChatMessageWithRetry(ai, {
      history: formattedHistory,
      message: contextPrompt,
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
    });

    res.json({ reply: replyText });
  } catch (error: any) {
    console.error("AI Chat Error:", error);
    let errorMsg = error.message || "Yapay zeka yanıtı oluşturulurken bir hata oluştu.";
    if (errorMsg.includes("503") || errorMsg.includes("UNAVAILABLE") || errorMsg.includes("high demand")) {
      errorMsg = "Yapay zeka servisinde anlık bir yoğunluk yaşanıyor (503). Lütfen sorunuzu birkaç saniye sonra tekrar gönderiniz.";
    }
    res.status(500).json({ error: errorMsg });
  }
});

// Vite & Static file handling
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
