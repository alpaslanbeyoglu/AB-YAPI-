import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { generateArchitecturalSvgDrawing } from "./src/utils/architecturalSvgEngine";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

let aiInstance: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not defined. Please define it in your environment settings.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// Robust wrapper to handle high demand (503), rate limits (429) with retry and fallback models
async function generateTextWithFallbackAndRetry(
  params: {
    contents: any;
    config?: any;
  },
  modelsToTry: string[] = ['gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-1.5-flash', 'gemini-3.8-flash']
): Promise<any> {
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    const maxRetries = 2;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await getGenAI().models.generateContent({
          model: modelName,
          contents: params.contents,
          config: params.config,
        });
        return response;
      } catch (err: any) {
        lastError = err;

        // If it is an invalid request (400 Client Error), fail fast immediately without retry or fallback
        const isClientError = err?.status === 400 || err?.error?.code === 400 || err?.message?.includes("400");
        if (isClientError) {
          throw err;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 400;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
  }

  throw lastError;
}

// Regex-based robust parser to extract structured information when all Gemini models are offline/unavailable
function parseOfferTextFallback(text: string): any {
  const normalized = text.toLowerCase().trim();
  
  // Default values
  const result: any = {
    projectName: "Yeni Proje Kentsel Dönüşüm ve İnşaat Teklifi",
    projectAddress: "İstanbul",
    landArea: 500,
    baseBuildArea: 150,
    floorCount: 5,
    flatsPerFloor: 2,
    hasGroundFloorShop: false,
    shopCount: 0,
    basementCount: 1,
    basementPurpose: "shelter_depot",
    basementShopCount: 0,
    buildingType: "standard",
    quality: "standard",
    projectModel: "cash",
    contractorShareRate: 50,
    transformationStatus: "none",
    manualMonths: 15,
    hasUnderfloorHeating: false,
    hasWaterFiltration: false,
    hasLinearShowerDrain: true,
    hasSmartDoorLock: false,
    hasAcOption: false,
    soilType: "solid",
    introExplanation: "",
    customContractNotes: "",
    additionalOfferClauses: []
  };

  // Extract address info
  if (normalized.includes("kadıköy") || normalized.includes("kadikoy")) result.projectAddress = "Kadıköy, İstanbul";
  else if (normalized.includes("beşiktaş") || normalized.includes("besiktas")) result.projectAddress = "Beşiktaş, İstanbul";
  else if (normalized.includes("şişli") || normalized.includes("sisli")) result.projectAddress = "Şişli, İstanbul";
  else if (normalized.includes("kartal")) result.projectAddress = "Kartal, İstanbul";
  else if (normalized.includes("maltepe")) result.projectAddress = "Maltepe, İstanbul";
  else if (normalized.includes("üsküdar") || normalized.includes("uskudar")) result.projectAddress = "Üsküdar, İstanbul";
  else if (normalized.includes("ümraniye") || normalized.includes("umraniye")) result.projectAddress = "Ümraniye, İstanbul";
  else if (normalized.includes("ataşehir") || normalized.includes("atasehir")) result.projectAddress = "Ataşehir, İstanbul";
  else if (normalized.includes("bostancı") || normalized.includes("bostanci")) result.projectAddress = "Bostancı, İstanbul";
  else if (normalized.includes("bağdat caddesi") || normalized.includes("bagdat caddesi")) result.projectAddress = "Bağdat Caddesi, İstanbul";

  // Try to parse Project Name
  const nameMatch = text.match(/(?:proje\s*adı|müşteri\s*adı|adına)\s*:\s*([^\n\r]+)/i);
  if (nameMatch) {
    result.projectName = nameMatch[1].trim();
  } else if (result.projectAddress !== "İstanbul") {
    result.projectName = `${result.projectAddress.split(",")[0]} Çağdaş Kentsel Dönüşüm Projesi`;
  }

  // Match land area (e.g., "500 m2", "500m2", "500 metrekare")
  const landAreaMatch = normalized.match(/(\d+)\s*(?:m2|m²|metrekare)\s*(?:arsa|arazi)/i) || normalized.match(/(?:arsa|arazi|parsel)\s*(?:alanı|boyutu)?\s*(?:olan)?\s*(\d+)\s*(?:m2|m²|metrekare)/i) || normalized.match(/(\d+)\s*(?:m2|m²|metrekare)/i);
  if (landAreaMatch) {
    result.landArea = Math.max(100, parseInt(landAreaMatch[1], 10));
  }

  // Match base build area
  const baseAreaMatch = normalized.match(/(?:taban|oturum)\s*(?:alanı|oturumu)?\s*(?:olan)?\s*(\d+)\s*(?:m2|m²|metrekare)/i) || normalized.match(/(\d+)\s*(?:m2|m²|metrekare)\s*(?:taban|oturum)/i);
  if (baseAreaMatch) {
    result.baseBuildArea = Math.max(40, parseInt(baseAreaMatch[1], 10));
  } else {
    result.baseBuildArea = Math.round(result.landArea * 0.35);
  }

  // Match floor count
  const floorMatch = normalized.match(/(\d+)\s*kat/i) || normalized.match(/zemin\s*üstü\s*(\d+)/i);
  if (floorMatch) {
    result.floorCount = Math.max(1, parseInt(floorMatch[1], 10));
  }

  // Match flats per floor
  const flatsMatch = normalized.match(/(?:her\s*katta|katta)\s*(\d+)\s*daire/i) || normalized.match(/(?:her\s*katta|katta)\s*(\d+)/i);
  if (flatsMatch) {
    result.flatsPerFloor = Math.max(1, parseInt(flatsMatch[1], 10));
  }

  // Ground floor shop
  if (normalized.includes("dükkan") || normalized.includes("dukkan") || normalized.includes("mağaza") || normalized.includes("magaza") || normalized.includes("ticari")) {
    result.hasGroundFloorShop = true;
    const shopMatch = normalized.match(/(\d+)\s*(?:adet)?\s*(?:dükkan|dukkan|mağaza|magaza|ticari)/i) || normalized.match(/(?:dükkan|dukkan|mağaza|magaza)\s*(?:sayısı)?\s*(\d+)/i);
    if (shopMatch) {
      result.shopCount = Math.max(1, parseInt(shopMatch[1], 10));
    } else {
      result.shopCount = 2;
    }
  }

  // Basement count & purpose
  const basementMatch = normalized.match(/(\d+)\s*bodrum/i) || normalized.match(/bodrum\s*kat/i);
  if (basementMatch) {
    result.basementCount = basementMatch[1] ? Math.max(1, parseInt(basementMatch[1], 10)) : 1;
    if (normalized.includes("sığınak") || normalized.includes("siginak") || normalized.includes("depo")) {
      result.basementPurpose = "shelter_depot";
    } else if (normalized.includes("otopark") || normalized.includes("park")) {
      result.basementPurpose = "parking";
    }
  }

  // Building Type & Quality
  if (normalized.includes("lüks") || normalized.includes("luks") || normalized.includes("luxury")) {
    result.buildingType = "luxury";
    result.quality = "luxury";
  } else if (normalized.includes("ultra lüks") || normalized.includes("premium") || normalized.includes("rezidans")) {
    result.buildingType = "luxury";
    result.quality = "premium";
  } else if (normalized.includes("ticari") || normalized.includes("ofis") || normalized.includes("plaza")) {
    result.buildingType = "commercial";
    result.quality = "standard";
  }

  // Project Model
  if (normalized.includes("kat karşılığı") || normalized.includes("kat karsiligi") || normalized.includes("oran") || normalized.includes("%")) {
    result.projectModel = "contractorShare";
    const rateMatch = normalized.match(/%\s*(\d+)/) || normalized.match(/yüzde\s*(\d+)/i) || normalized.match(/(\d+)\s*%/);
    if (rateMatch) {
      result.contractorShareRate = Math.min(100, Math.max(1, parseInt(rateMatch[1], 10)));
    }
  }

  // Transformation Status
  if (normalized.includes("kentsel dönüşüm") || normalized.includes("kentsel donusum") || normalized.includes("deprem")) {
    result.transformationStatus = "currentSupport";
  }

  // Smart options inference
  result.hasUnderfloorHeating = normalized.includes("yerden") || result.quality !== "standard";
  result.hasWaterFiltration = result.quality === "premium" || normalized.includes("arıtma") || normalized.includes("aritma");
  result.hasLinearShowerDrain = true;
  result.hasSmartDoorLock = result.quality !== "standard" || normalized.includes("akıllı kilit") || normalized.includes("parmak iz");
  result.hasAcOption = normalized.includes("klima") || result.quality === "premium";
  result.manualMonths = Math.min(24, Math.max(12, 10 + Math.round(result.floorCount * 1.2)));

  // Executive presentation summary (introExplanation)
  result.introExplanation = `Sayın Kat Malikleri ve Arsa Sahipleri;\n\n${result.projectAddress} mevkiinde bulunan taşınmazınız için hazırlanan bu resmi inşaat ve kentsel dönüşüm teklifi; bölgenin imar planları, zemin yapısı ve modern şehircilik standartları esas alınarak titizlikle oluşturulmuştur. Zemin üstü ${result.floorCount} kat ve katta ${result.flatsPerFloor} bağımsız bölüm olarak kurgulanan mimari projemiz, maksimum net kullanım alanı ve yüksek deprem mukavemeti hedeflenerek tasarlanmıştır.${result.hasGroundFloorShop ? ` Zemin katta yer alan ${result.shopCount} adet ticari dükkan birimi ise cadde cephesine prestij ve yüksek yatırım değeri katacaktır.` : ''}\n\nYüklenici firma olarak taahhüdümüz; yürürlükteki en güncel 2018 Türkiye Bina Deprem Yönetmeliği standartlarına tavizsiz uymak, 1. sınıf malzeme kalitesini garanti altına almak ve projenizi ruhsat tarihinden itibaren ${result.manualMonths} ay içinde eksiksiz anahtar teslim etmektir.`;

  // Custom contract notes
  result.customContractNotes = `İnşaat süresince şantiye all-risk sigortası, yapı denetim ve iş güvenliği maliyetleri yüklenici firma sorumluluğundadır. İmar ve ruhsat onay sürecinden itibaren ${result.manualMonths} ay içinde anahtar teslimi yapılacaktır.`;

  // Professional 7-Clause Construction & Legal Specification
  result.additionalOfferClauses = [
    `1. Statik Taşıyıcı Sistem ve Deprem Güvenliği: Proje, 2018 Türkiye Bina Deprem Yönetmeliği (TBDY-2018) ve TS 500 standartlarına tam uygun olarak radye jeneral temel üzerinde C35/45 sınıfı hazır beton ve B420C nervürlü donatı çeliği ile inşa edilecektir. Zemin etüt raporunun gerektirdiği tüm statik güvenlik katsayıları eksiksiz uygulanacaktır.`,
    `2. Mimari Yerleşim ve Bağımsız Bölüm Hakları: Zemin üstü ${result.floorCount} kat ve katta ${result.flatsPerFloor} bağımsız bölüm olarak onaylı mimari projeye göre inşa edilecek; her bağımsız bölümün net ve brüt alan dengesi ile doğal ışık alımı maksimize edilecektir.${result.hasGroundFloorShop ? ` Zemin kattaki ${result.shopCount} adet dükkanın giriş ve vitrin aksları konut girişlerinden tamamen bağımsız olacaktır.` : ''}`,
    `3. Isı, Ses Yalıtımı ve Mekanik Donanım: Binanın tüm dış cephesinde minimum 8 cm kalınlığında 150 kg/m³ yoğunluklu taş yünü mantolama ile TS 825 standartlarında A/B sınıfı Enerji Kimlik Belgesi hedeflenecektir.${result.hasUnderfloorHeating ? ' Bağımsız bölümlerde homojen ısı dağılımı sağlayan oksijen bariyerli borularla sulu yerden ısıtma sistemi tesis edilecektir.' : ' Isıtma tesisatı tam yoğuşmalı kombi ve panel radyatör altyapısına uygun olarak döşenecektir.'} Ayrıca su kesintilerine karşı ortak su deposu ve frekans kontrollü hidrofor sistemi devreye alınacaktır.`,
    `4. 1. Sınıf İç Mimari ve İnce İşçilik: Islak hacimlerde 1. sınıf TSE belgeli porselen/seramik, salon ve odalarda 32. sınıf derzli laminant parke; mutfaklarda frenli mekanizmalı MDF gövde üzeri lake/akrilik kapaklı dolaplar ve Çimstone/granit tezgahlar; banyolarda gömme rezervuarlı asma klozetler ve paslanmaz çelik lineer duş süzgeçleri uygulanacaktır.`,
    `5. Dikey Ulaşım ve Asansör Konforu: Binada TSE ve EN 81-20/50 normlarında, frekans kontrollü (VVVF), sessiz çalışan, elektrik kesintisinde en yakın kata getiren kurtaran sistemli ve sedye/engelli taşınmasına elverişli lüks kabinli asansör kurulacaktır.${result.basementCount > 0 ? ` Bodrum katta ${result.basementPurpose === 'parking' ? 'kapalı otopark' : 'sığınak ve ortak depo alanı'} teşkil edilecektir.` : ''}`,
    `6. İş Teslim Süresi ve Gecikme Tazminatı: İlgili belediyeden inşaat ruhsatının alındığı tarihten itibaren en geç ${result.manualMonths} ay içinde yapı kullanma izin belgesi (iskan) aşamasına getirilerek bağımsız bölümler maliklere teslim edilecektir. Mücbir sebepler haricindeki gecikmelerde yüklenici firma, geciken her ay için güncel emsal kira bedeli üzerinden gecikme tazminatı ödemeyi peşinen kabul ve taahhüt eder.`,
    `7. Garanti ve Satış Sonrası Teknik Destek: Taşıyıcı betonarme karkas sistemde 10 (on) yıl; çatı, dış cephe su/ısı yalıtımı ve mekanik tesisatlarda 5 (beş) yıl; ince işçilik ve montaj imalatlarında ise 2 (iki) yıl süreyle yüklenici firma tarafından bilabedel teknik servis ve garanti sağlanacaktır.`
  ];

  return result;
}

// Quota tracking to prevent unnecessary 429 exceptions when image model quota is exhausted
let geminiImageQuotaExceededUntil = 0;

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// AI Offer Generator from Text
app.post("/api/ai-generate-offer", async (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: "Geçerli bir metin girişi gereklidir." });
  }

  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY tanımlanmamış.");
    }

    const prompt = `Sen Türkiye'nin en deneyimli baş inşaat mühendisi, mimarı ve kentsel dönüşüm hukuk danışmanısın.
Aşağıda kullanıcının serbest metin olarak girdiği inşaat/proje teklif talebi bulunmaktadır.

Kullanıcı Metni:
"""
${text}
"""

KRİTİK TALİMATLAR VE YASAKLAR:
1. KULLANICININ YAZDIĞI METNİ ASLA AYNEN KOPYALAYIP MADDE OLARAK KOYMA! Kullanıcı yüzeysel bir özet değil; resmi, kurumsal ve mühendislik derinliği olan bir şartname beklemektedir.
2. "additionalOfferClauses" dizisi için kullanıcının verdiği bilgilere göre 6 ile 8 adet profesyonel, hukuki ve teknik bağlayıcılığı olan resmi Türk inşaat ve teklif maddesi oluştur. Her madde başlığıyla ve detaylı teknik açıklamasıyla yazılmalıdır (Örnek: "1. Statik Taşıyıcı Sistem ve Deprem Güvenliği: ...", "2. Mimari ve Bağımsız Bölüm Fonksiyonelliği: ...", "3. Mekanik Tesisat ve Isı Yalıtımı: ...", "4. İç Mimari ve 1. Sınıf İnce İşçilik: ...", "5. Dikey Ulaşım ve Asansör Konforu: ...", "6. Anahtar Teslim Süresi ve Gecikme Tazminatı Taahhüdü: ...", "7. Garanti ve Satış Sonrası Hizmet: ...").
3. "introExplanation" alanında kat maliklerine hitap eden, projenin mimari değerini, deprem güvenliğini, imar ve kentsel dönüşüm avantajlarını açıklayan 2-3 paragraflık prestijli bir Yönetici Özeti (Sunum Metni) hazırla.
4. "customContractNotes" alanında resmi noter sözleşmesi, şantiye sigortası ve belediye harçlarına dair yüklenici taahhütlerini özetle.
5. Kullanıcı metnindeki ipuçlarına göre "hasUnderfloorHeating", "hasWaterFiltration", "hasLinearShowerDrain", "hasSmartDoorLock", "hasAcOption" gibi donanımları akıllıca belirle.

Lütfen aşağıdaki anahtarlara sahip geçerli bir JSON objesi döndür (Markdown blokları veya açıklama olmadan, sadece saf JSON):
{
  "projectName": "Prestijli Proje Adı",
  "projectAddress": "Resmi Konum / İlçe, İl",
  "landArea": sayı (m2),
  "baseBuildArea": sayı (m2 taban),
  "floorCount": sayı (zemin üstü kat),
  "flatsPerFloor": sayı (katta daire sayısı),
  "hasGroundFloorShop": boolean,
  "shopCount": sayı,
  "basementCount": sayı,
  "basementPurpose": "shelter_depot" | "parking" | "shop" | "commercial_shop",
  "basementShopCount": sayı,
  "buildingType": "standard" | "luxury" | "commercial",
  "quality": "standard" | "luxury" | "premium",
  "projectModel": "cash" | "contractorShare",
  "contractorShareRate": sayı (örneğin 50),
  "transformationStatus": "currentSupport" | "futureSupport2027" | "none",
  "manualMonths": sayı (tahmini teslim süresi, örn: 14 veya 16),
  "hasUnderfloorHeating": boolean,
  "hasWaterFiltration": boolean,
  "hasLinearShowerDrain": boolean,
  "hasSmartDoorLock": boolean,
  "hasAcOption": boolean,
  "introExplanation": "Maliklere ve arsa sahiplerine yönelik 2-3 paragraflık detaylı mimari/mühendislik yönetici özeti",
  "customContractNotes": "Resmi sözleşme ve güvence taahhüt özeti",
  "additionalOfferClauses": [
    "1. Statik Taşıyıcı Sistem ve Deprem Güvenliği: ...",
    "2. Mimari Yerleşim ve Bağımsız Bölüm Dağılımı: ...",
    "3. Isı Yalıtımı ve Mekanik Tesisat Standartları: ...",
    "4. İç Mekan ve 1. Sınıf İnce İşçilik Şartnamesi: ...",
    "5. Asansör ve Ortak Mahaller Konforu: ...",
    "6. İş Teslim Süresi ve Emsal Kira Tazminatı Güvencesi: ...",
    "7. Yüklenici Garanti ve Satış Sonrası Servis Taahhüdü: ..."
  ]
}
`;

    const response = await generateTextWithFallbackAndRetry({
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
    res.json({ success: true, data: parsedData, isFallback: false });
  } catch (error: any) {
    try {
      const parsedData = parseOfferTextFallback(text);
      res.json({ success: true, data: parsedData, isFallback: true });
    } catch (fallbackError: any) {
      res.status(500).json({ error: "Teklif ayrıştırma sırasında bir hata oluştu." });
    }
  }
});

// AI Social Media Caption Generator Endpoint
app.post("/api/generate-social-caption", async (req, res) => {
  const { projectName, location, templateType, platform, companyName, slogan, additionalInfo } = req.body;
  
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not defined.");
    }

    const platformPrompts: Record<string, string> = {
      instagram: "Instagram: Enerjik, dikkat çekici, bol emojili, samimi ama profesyonel, okuması kolay kısa paragraflarla yazılmalı. En alta 7-10 popüler inşaat ve kentsel dönüşüm etiketi (#kentseldönüşüm gibi) eklenmeli.",
      linkedin: "LinkedIn: Profesyonel, kurumsal, mühendislik derinliği ve statik deprem güvenliğine odaklı, vizyoner, sektör analizlerine yer veren, resmi bir dil. En alta 4-5 profesyonel sektör etiketi eklenmeli.",
      facebook_whatsapp: "Facebook/WhatsApp: Bilgilendirici, güven veren, sıcak ve aile dostu, net iletişim bilgilerine ve çağrılara odaklı. Kısa ve paylaşılabilir yapıda."
    };

    const templatePrompts: Record<string, string> = {
      warm_family_home: "Sıcak Yuva ve Aile Huzuru: Sadece betonarme bir bina değil, ailelerin ve çocukların nesiller boyu güvenle, huzurla ve mutlulukla yaşayacağı sıcak bir yuva inşa ettiğimizi anlatan duygusal, samimi ve güven veren bir paylaşım.",
      modern_comfort_options: "Üstün Konfor ve Donanım Opsiyonları: Yerden ısıtma, yüksek tavan ferahlığı, 1. sınıf ankastre mutfak, ebeveyn banyosu, tam otomatik asansör ve otopark gibi yaşam konforunu yükselten donanım seçeneklerimizi tanıtan etkileyici bir paylaşım.",
      custom_interior_choices: "Kişiye Özel Malzeme ve Renk Seçim Opsiyonu: İnşaat aşamasında kat maliklerimize mutfak dolabı, tezgah, seramik, parke ve iç kapı renk/modellerini kendi zevklerine göre seçme ayrıcalığı sunduğumuzu vurgulayan cazip bir paylaşım.",
      quality_of_life_smart: "Yüksek Yaşam Kalitesi ve Akıllı Altyapı: Komşular arası üst düzey ses/ısı yalıtımı, görüntülü interkom, 7/24 güvenlik kamerası, su deposu, jeneratör ve akıllı ev altyapısı ile yaşam kalitesini nasıl yükselttiğimizi anlatan paylaşım.",
      eco_energy_savings: "Dört Mevsim Konfor ve Enerji Tasarrufu: Taş yünü mantolama, konfor ısıcam doğramalar ve verimli ısıtma sistemleriyle kışın sıcak, yazın serin ve düşük faturalı, bütçe dostu yuvalar ürettiğimizi anlatan paylaşım.",
      value_investment_life: "Değer Kazanan Yatırım ve Prestij: Hem bugün huzurla oturulacak konforlu bir yuva hem de estetik dış cephesi ve iskanlı sağlam tapusuyla yarın değerine değer katacak yüksek yatırım potansiyelli konutlar ürettiğimizi anlatan paylaşım.",
      urban_transformation_guide: "Kentsel Dönüşüm Rehberi: Eski ve riskli binaların 3 adımda güvenli, modern ve yüksek değerli yuvalara nasıl dönüştürüldüğünü anlatan bilgilendirici paylaşım.",
      seismic_safety_standards: "Deprem ve Yapı Güvenliği: 2018 Türkiye Bina Deprem Yönetmeliğine uygun radye temel, C35/45 hazır beton ve güçlü taşıyıcı sistem standartlarımızı anlatan güven odaklı paylaşım.",
      state_grant_support: "Hibe, Kredi ve Kira Yardımı Rehberi: Kentsel dönüşümde devlet destekli yapım hibesi, uygun kredi, kira yardımı ve harç muafiyetlerini maliklere açıklayan bilgilendirici paylaşım.",
      free_feasibility_check: "Ücretsiz Ön Analiz ve Teklif: Bin주/arsa sahiplerine sunduğumuz ücretsiz imar analizi, kat planı çalışması ve şeffaf teklif hizmetini tanıtan harekete geçirici paylaşım.",
      transparent_flat_for_land: "Kat Karşılığı Güvence Modeli: Hak sahiplerinin haklarını koruyan, noter kurası, teknik şartname garantisi ve kira yardımı güvenceli şeffaf kat karşılığı modelimizi anlatan paylaşım.",
      corporate_trust_vision: "Kurumsal Kimlik ve Güven: Şirketimizin şeffaf sözleşme ilkeleri, birinci sınıf malzeme kalitesi ve ruhsattan iskana kurumsal süreç yönetimini anlatan vizyon paylaşımı.",
      new_project_launch: "Yeni Proje Duyurusu: Projenin başlangıcını, mimari özelliklerini, deprem direncini ve yüksek yaşam standartlarını müjdeleyen heyecan verici bir paylaşım.",
      show_flat_interior: "İç Mekân ve İnce İşçilik Tanıtımı: Lake mutfak dolapları, kuvars tezgah, yağmur duş, gizli LED aydınlatma ve 1. sınıf ince işçilik detaylarımızı öne çıkaran estetik paylaşım.",
      new_project: "Yeni Proje Duyurusu: Projenin başlangıcını, arsa ve imar özelliklerini, deprem direncini ve lüks yaşam standartlarını müjdeleyen heyecan verici bir paylaşım.",
      construction_progress: "Şantiye İlerleme Güncellemesi: Devam eden beton dökümü, kaba inşaat seviyesi, şantiyedeki hummalı çalışma ve taahhüt edilen teslim süresine odaklanan dinamik bir paylaşım.",
      completed_handover: "Tamamlanan İş / Referans: Teslim edilen dairelerin konforunu, memnun kat maliklerini, modern dış cepheyi ve bölgeye değer katan estetik mimariyi anlatan gurur verici bir referans paylaşımı.",
      completed_project: "Tamamlanan İş / Referans: Teslim edilen dairelerin konforunu, memnun kat maliklerini, modern dış cepheyi ve bölgeye değer katan estetik mimariyi anlatan gurur verici bir referans paylaşımı.",
      urban_transformation: "Kentsel Dönüşüm Fırsatı: Eski ve riskli binaların kentsel dönüşüm teşviki, hibe ve kredilerle nasıl güvenli, modern ve lüks konutlara dönüştürülebileceğini açıklayan paylaşım.",
      corporate_intro: "Kurumsal Slogan ve Tanıtım: Şirketin uzmanlığı, güvenilirliği ve kurumsal gücünü ön plana çıkaran prestijli bir tanıtım paylaşımı.",
      earthquake_safety: "Deprem Güvenliği: Türkiye deprem kuşağında sismik güvenlik, radye temel ve C35 hazır beton önemini anlatan paylaşım.",
      urban_info: "Kentsel Dönüşüm Bilgilendirme: Kentsel dönüşümün aşamaları, devlet destekleri, hibe ve krediler hakkında genel bilgi veren paylaşım.",
      expert_advice: "Ücretsiz Ön Rapor: Maliklerin binalarını yenilemeden önce ücretsiz kentsel dönüşüm ön analiz raporu alabileceklerini anlatan çağrı paylaşımı."
    };

    const selectedPlatformPrompt = platformPrompts[platform] || platformPrompts.instagram;
    const selectedTemplatePrompt = templatePrompts[templateType] || templatePrompts.new_project;

    const prompt = `Sen Türkiye'nin en deneyimli inşaat, taahhüt ve kentsel dönüşüm şirketinin kurumsal iletişim uzmanısın.
Aşağıdaki seçili bilgi kartı içeriğine dayanarak mükemmel, genel geçer ve kurumsal bir sosyal medya gönderi metni (caption) yaz.

FİRMA BİLGİLERİ:
- Firma Adı: ${companyName || 'AB YAPI'}
- Firma Sloganı: ${slogan || 'Güvene Yükselen Yapılar'}

SEÇİLİ BİLGİ KARTI İÇERİĞİ VE ODAK NOKTASI:
- Kart Konsepti / Başlığı: ${projectName || 'Kurumsal Bilgi Kartı'}
${additionalInfo ? `- Kart Maddeleri ve Vurgular: ${additionalInfo}` : ''}

YAZIM FORMATI VE HEDEF PLATFORM:
- Platform Tarzı: ${selectedPlatformPrompt}
- Gönderi Amacı / Şablon: ${selectedTemplatePrompt}

Önemli Kurallar:
1. KESİNLİKLE YER VEYA KONUM İSMİ BELİRTME: Metin içinde hiçbir şehir, il, ilçe, semt, mahalle veya bölge adı (örneğin İstanbul, Fatih, Kocamustafapaşa vb.) veya konum odaklı etiket (#istanbulinsaat vb.) KESİNLİKLE KULLANMA. Her yerde paylaşılabilecek genel, zamansız ve kurumsal bir yazı üret.
2. Kesinlikle kurgusal veya yapay olmayan, sanki profesyonel bir kurumsal iletişim ajansı tarafından özenle kaleme alınmış hissi veren Türkçe bir metin üret.
3. Metin içinde firma yetkilisi veya mühendis/mimar gibi teknik unvanlar kullanma; kurumsal kimliğimizi "Firma Yönetimi", "Yönetim Ekibimiz" veya doğrudan "${companyName || 'AB YAPI'}" olarak temsil et.
4. Seçili bilgi kartındaki maddeleri (yuva sıcaklığı, konfor opsiyonları, yaşam kalitesi, kentsel dönüşüm veya yapı güvenliği) akıcı şekilde metne yansıt.
5. Emojileri yerinde ve estetik kullan, başlıkları vurgula.
6. Sadece gönderi metnini ve konum içermeyen genel sektörel etiketleri döndür, başka hiçbir açıklama döndürme.`;

    const response = await generateTextWithFallbackAndRetry({
      contents: prompt,
    });

    const caption = response.text || "";
    res.json({ success: true, caption: caption.trim() });
  } catch (error: any) {
    console.error("Social Caption Error:", error);
    const brandTag = companyName ? companyName.toLowerCase().replace(/\s+/g, '') : 'abyapi';
    let fallbackText = `🏡 ${companyName || 'AB YAPI'} Güvencesiyle Huzurlu Yuvalar, Yüksek Yaşam Kalitesi!\n\n✨ *${projectName || 'Güvenli ve Konforlu Yaşam Alanları'}*\n\nSadece bir bina değil; ailenizle ve sevdiklerinizle uzun yıllar huzurla yaşayacağınız, konforu ve güvenliği bir arada sunan modern yaşam alanları inşa ediyoruz.\n\n${additionalInfo ? `📌 Öne Çıkan Standartlarımız:\n${additionalInfo}\n\n` : ''}📞 Sunduğumuz konfor opsiyonları, kentsel dönüşüm çözümleri ve detaylı bilgi için bizimle iletişime geçin.\n🌐 https://ab-yapi.com.tr/\n\n#huzurluyuva #yaşamkalitesi #konforlukonut #kentseldönüşüm #güvenliyapılar #inşaat #${brandTag}`;

    if (templateType === 'construction_progress') {
      fallbackText = `⚡ Şantiyelerimizde Planlı, Titiz ve Güvenli İlerleyiş Devam Ediyor!\n\n🏗️ Kaliteden ödün vermeden, onaylı projelerimize ve iş takvimimize sadık kalarak güvenle yükseliyoruz.\n\nBetonarme, demir donatı ve ince işçilik imalatlarımızın her aşamasını yüksek kalite standartlarında tamamlıyor; güvenli yaşam alanlarınızı taahhüt ettiğimiz sürede anahtar teslim sunmak için özenle çalışıyoruz.\n\n🌐 Kurumsal çözümlerimizi incelemek için: https://ab-yapi.com.tr/\n\n#şantiyegünlükleri #inşaat #güvenliyapılar #kaliteliişçilik #modernyapı #${brandTag}`;
    } else if (templateType === 'completed_project' || templateType === 'completed_handover') {
      fallbackText = `🔑 Bir Mutluluk Hikayesi Daha: Söz Verdiğimiz Gibi Anahtar Teslim!\n\n🎉 Modern dış cephesi, ferah kat planları ve 1. sınıf ince işçilik kalitesiyle özenle tamamladığımız projemizde kat maliklerimize anahtarlarını teslim etmenin gururunu yaşıyoruz.\n\nYeni yuvalarında tüm maliklerimize aileleriyle birlikte sağlıklı, huzurlu ve güvenli bir ömür dileriz.\n\n👉 Hizmetlerimiz ve referans standartlarımız için: https://ab-yapi.com.tr/\n\n#anahtarteslim #huzurluyuva #referansproje #modernkonut #yaşamkalitesi #${brandTag}`;
    } else if (templateType === 'urban_transformation' || templateType === 'urban_transformation_guide') {
      fallbackText = `🛡️ Depreme Dayanıklı, Konforlu Yarınlar İçin Kentsel Dönüşüm Vakti!\n\nEski veya ekonomik ömrünü tamamlamış binanızı ${companyName || 'AB YAPI'} güvencesiyle yenileyin, geleceğe güvenle bakın!\n\n💡 Devlet destekli hibe, uygun kredi ve kira yardımı avantajlarından yararlanarak; şeffaf sözleşme ve üstün konfor opsiyonlarıyla binanızı yüksek değerli modern bir yuvaya dönüştürüyoruz.\n\n🗣️ Ücretsiz ön analiz ve dönüşüm danışmanlığı için hemen bize ulaşın:\n🌐 https://ab-yapi.com.tr/\n\n#kentseldönüşüm #güvenliyapı #modernyuva #binayenileme #yaşamkalitesi #${brandTag}`;
    }

    res.json({ success: true, caption: fallbackText, isFallback: true });
  }
});

// Nano Banana AI Blueprint & Architectural Drawing Generator Endpoint
app.post("/api/generate-blueprint-drawing", async (req, res) => {
  try {
    const {
      drawingType = "floor_plan",
      styleTheme = "modern_architectural",
      aspectRatio = "4:3",
      customPromptNote = "",
      preferredEngine = "auto",
      projectData = {},
    } = req.body;

    const {
      facadeWidth = 20,
      facadeDepth = 12,
      floorCount = 5,
      flatsPerFloor = 2,
      hasGroundFloorShop = false,
      shopCount = 1,
      hasBasement = false,
      basementCount = 1,
      roofType = "mansard",
      customFacades = [],
      hasCantilever = false,
      cantileverDepth = 1.5,
      polygonPoints = [],
      mainEntranceFacadeIndex = 0,
      flats = [],
      baseBuildArea,
      flatDistributionMode = "equal",
    } = projectData;

    // Helper to generate high-precision architectural CAD drawing with full projectData
    const produceVectorDrawing = () => {
      const svgStr = generateArchitecturalSvgDrawing(
        projectData,
        drawingType,
        styleTheme,
        aspectRatio
      );
      const base64 = Buffer.from(svgStr, "utf-8").toString("base64");
      return `data:image/svg+xml;base64,${base64}`;
    };

    // If user explicitly asks for precision CAD or if GEMINI_API_KEY is missing
    if (preferredEngine === "precision_cad" || !process.env.GEMINI_API_KEY) {
      const vectorUrl = produceVectorDrawing();
      return res.json({
        success: true,
        imageUrl: vectorUrl,
        engineUsed: "precision_cad",
        isVector: true,
        promptUsed: "Hassas Vektörel Mimari CAD Çizim Motoru",
        metadata: {
          drawingType,
          styleTheme,
          aspectRatio,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Edge / Facade descriptions
    const computedArea = baseBuildArea && baseBuildArea > 0 ? baseBuildArea : (facadeWidth * facadeDepth);
    let edgesDescription = `Building dimensions: Front Facade is ${facadeWidth}m, Side/Depth Facade is ${facadeDepth}m (~${computedArea.toFixed(1)} m² footprint).`;

    if (polygonPoints && Array.isArray(polygonPoints) && polygonPoints.length >= 3) {
      const ptsDesc = polygonPoints.map((p: any, idx: number) => `P${idx + 1}(x:${p.x.toFixed(1)}m, y:${p.y.toFixed(1)}m)`).join(', ');
      edgesDescription += ` Exact drawn geometric polygon vertices: [${ptsDesc}].`;
    }

    if (customFacades && Array.isArray(customFacades) && customFacades.length > 0) {
      const sidesDesc = customFacades
        .map((f: any, idx: number) => `Edge ${idx + 1} (${f.name || 'Cephe'}): ${f.length}m`)
        .join(", ");
      edgesDescription += ` Measured facade edges: ${sidesDesc}.`;
    }

    // Main entrance facade specification
    const entranceFacadeName = customFacades?.[mainEntranceFacadeIndex]?.name || `${mainEntranceFacadeIndex + 1}. Cephe`;
    const entranceDescription = `Main building entrance is situated on Facade #${mainEntranceFacadeIndex + 1} (${entranceFacadeName}). Designed in full compliance with Turkish Zoning Regulations (Planlı Alanlar İmar Yönetmeliği & TS 9111): 1.80m double-leaf entrance door (1.20m + 0.60m leaves), 2.80m x 2.40m vestibule windbreak with intercom and mailboxes, 1.50m wide TS 9111 accessible handicap ramp with 5% slope and dual handrails, 800kg/10-person stretcher elevator shaft (1.80m x 2.10m), and 1.25m wide fire escape staircase.`;

    // Flats distribution specification
    let flatsDescription = `Residential Units: Exactly ${flatsPerFloor} independent residential apartments per floor.`;
    
    // Floor area distribution mode logic
    let distributionModeText = "";
    if (flatDistributionMode === 'front_large') {
      distributionModeText = `Floor Area Distribution Mode: Front facade units are substantially larger 3+1 apartments (~30% floor area each with en-suite master bathroom, separate kitchen, and front street balconies), while rear units are compact 2+1 apartments (~20% floor area each).`;
    } else if (flatDistributionMode === 'asymmetric_master') {
      distributionModeText = `Floor Area Distribution Mode: Asymmetric luxury layout featuring 1 large panoramic corner Master Suite flat (~40% floor area, 3+1 or 4+1) and 3 balanced standard flats (~20% floor area each).`;
    } else if (flatDistributionMode === 'custom_proportions') {
      distributionModeText = `Floor Area Distribution Mode: Custom proportional distribution according to land ownership deed allocation percentages.`;
    } else {
      distributionModeText = `Floor Area Distribution Mode: Symmetrical equal area distribution (each flat receives an equal share, e.g. 25% each for 4 flats per floor).`;
    }
    flatsDescription += ` ${distributionModeText}`;

    if (flats && Array.isArray(flats) && flats.length > 0) {
      const flatList = flats.slice(0, flatsPerFloor).map((fl: any, i: number) =>
        `Flat ${i + 1}: ${fl.name || `${i + 1}. Daire`} (${fl.isContractorShare ? 'Contractor Share' : 'Landowner Share'}, Net: ~${fl.area || Math.round(computedArea * 0.4)} m²)`
      ).join('; ');
      flatsDescription += ` Exact apartment distribution: ${flatList}.`;
    }

    if (hasBasement) {
      const basementCount = projectData.basementCount || 1;
      let basementDetails = `Building includes ${basementCount} basement floor(s).`;
      if (projectData.basementConfig && Array.isArray(projectData.basementConfig) && projectData.basementConfig.length > 0) {
        const configText = projectData.basementConfig.map((u: any) => `${u.count} unit(s) of type ${u.type} (${u.description || 'General'})`).join(', ');
        basementDetails += ` Specific basement unit configuration: ${configText}.`;
      }
      edgesDescription += ` ${basementDetails}`;
    }

    if (hasCantilever) {
      edgesDescription += ` Upper floors feature cantilever architectural balcony overhangs of ${cantileverDepth}m.`;
    }

    // Style prompt additions
    let styleDetails = "";
    if (styleTheme === "cad_blueprint") {
      styleDetails = "High-contrast technical CAD cyan blueprint style with crisp white technical drawing lines, structural grid overlay, and dimension strings.";
    } else if (styleTheme === "colored_presentation") {
      styleDetails = "Polished architectural presentation layout with subtle warm wooden floor textures, rendered furniture, clean shadows, and soft ambient tones.";
    } else {
      styleDetails = "Modern professional architectural drawing on clean white drafting paper with razor-sharp black ink lines, technical hatch patterns, and minimalist typography.";
    }

    let fullPrompt = "";
    if (drawingType === "floor_plan") {
      fullPrompt = `High-resolution professional architectural 2D CAD floor plan drawing (TS EN ISO 128 standard), top-down orthographic plan view.
${edgesDescription}
${entranceDescription}
${flatsDescription}
Each apartment strictly includes fully rendered internal architectural rooms and partitions:
- Steel Entrance Security Door (90cm door leaf with 90-degree swing arc and handle rosette)
- Entrance Vestibule / Foyer (Antre & Hol) with built-in coat/shoe closet (vestiyer)
- Spacious Living Room & Dining Area (Salon) with L-shaped modular sectional sofa, coffee table, dining table with 6 chairs, TV wall unit, and expansive double-glazed exterior windows
- Separate Kitchen (Mutfak) with continuous L-shaped countertops, stainless steel dual-basin sink, 4-burner induction stovetop, and dedicated refrigerator alcove
- Master Bedroom (Ebeveyn Yatak Odası) with king-size double bed (160x200cm), padded headboard, dual bedside tables, and full-wall wardrobe
- Standard Bedrooms (Çocuk / Çalışma Odası) with single bed, study desk, ergonomic chair, and built-in closet
- Complete Bathrooms & Guest WC (Banyo) with glass-enclosed shower cabin, wall-hung rimless toilet with concealed dual-flush cistern, vanity sink counter, and vertical plumbing/ventilation chase
- Private Balconies (Balkon) with tempered glass balustrades and exterior access doors
Central Circulation Core: Reinforced concrete fire escape staircase (1.25m wide flights with handrails), TS 9111 accessible stretcher elevator (1.80m x 2.10m), and well-lit central distribution hallway.
Annotations: Grid axis bubble markers (A, B, C / 1, 2, 3), external and internal dimension strings, individual room net square meter labels, apartment designations (D1, D2, D3, D4), and North orientation compass arrow.
${styleDetails}
${customPromptNote ? `User specific requirements: ${customPromptNote}` : ""}`;
    } else if (drawingType === "facade_elevation") {
      fullPrompt = `High-resolution professional architectural facade elevation drawing (Ön Cephe Mimari Görünüş Çizimi) of a modern residential building.
Building height & storeys: Exactly ${floorCount} floors above ground level${hasGroundFloorShop ? `, with the ground floor featuring ${shopCount} modern commercial storefront shops with floor-to-ceiling glass vitrines` : ', with an elegant residential building lobby entrance'}.${hasBasement ? ` Also showing ${basementCount} basement level.` : ''}
Building width: ${facadeWidth} meters wide front facade.
Roof design: ${roofType === "mansard" || roofType === "duplex" ? "Setback terrace penthouse mansard roof with architectural dormers" : "Modern parapet flat terrace roof"}.
Features: Modern architectural facade linework, glass balustrade balconies on upper floors, composite facade panels, vertical louvers, window frames with realistic proportions.
Style: Crisp architectural elevation linework, scaled technical drawing presentation.
${styleDetails}
${customPromptNote ? `User specific requirements: ${customPromptNote}` : ""}`;
    } else if (drawingType === "ground_shop") {
      fullPrompt = `High-resolution professional architectural ground floor commercial layout plan (Zemin Kat Dükkan ve Mağaza Mimari Planı).
${edgesDescription}
Commercial Features: Ground floor features ${shopCount} commercial street-facing shops/stores (Cadde Dükkanı) with wide glass shopfronts, customer entrance doors, display areas, office/storage spaces, and customer rest rooms.
Also features a completely isolated, secure residential lobby entrance and elevator/staircase access leading to the upper residential floors.
Details: Architectural wall thicknesses, column grid, structural pillars, dimension chains, street frontage walkway.
${styleDetails}
${customPromptNote ? `User specific requirements: ${customPromptNote}` : ""}`;
    } else if (drawingType === "3d_isometric") {
      fullPrompt = `High-resolution 3D isometric cutaway architectural floor plan render (Aksonometrik 3D Kesit Kat Planı).
${edgesDescription}
Layout: Cutaway architectural model of a typical floor with ${flatsPerFloor} fully furnished modern apartments without roofs/ceilings, viewed from an elevated 45-degree isometric perspective.
Interiors: Shows detailed contemporary interior design with furniture in living rooms, fitted kitchens, beds, bathroom fixtures, and timber flooring.
Circulation: Shows central elevator and staircase core.
Render quality: Photorealistic architectural model rendering with soft contact shadows and clean neutral studio background.
${styleDetails}
${customPromptNote ? `User specific requirements: ${customPromptNote}` : ""}`;
    } else if (drawingType === "photorealistic_render" || drawingType === "3d_archviz") {
      const { facadeStyle = "concrete_brutalist", lightingMode = "sunset" } = projectData || {};
      const lightingText = lightingMode === "sunset" || lightingMode === "gun_batimi"
        ? "Cinematic golden hour sunset lighting (Akşam üstü gün batımı altın saat), low warm golden-amber sun rays grazing the building facade, deep dramatic soft contact shadows, warm interior window illumination, and ambient dusk twilight sky."
        : lightingMode === "night" || lightingMode === "blue_hour"
        ? "Blue hour twilight evening, architectural accent facade up-lighting, warm glowing interior apartment windows, illuminated ground-level storefronts, and deep indigo sky."
        : lightingMode === "sunrise"
        ? "Soft golden-peach early morning sunrise light, crisp cool shadows, and clear morning atmosphere."
        : "Bright architectural daylight with crisp sun reflections and neutral sky.";

      const facadeText = facadeStyle === "concrete_brutalist" || facadeStyle === "concrete"
        ? "Modern architectural exposed concrete panel facade (Mimari brüt beton paneller), smooth tactile grey concrete textures with formwork tie-holes and crisp recessed joints, dark anthracite aluminum window frames, warm timber accent louvers, and clear glass balustrade balconies."
        : facadeStyle === "wood_anthracite"
        ? "Contemporary dark anthracite composite facade paired with rich natural teak wood slats and dark aluminum joinery."
        : facadeStyle === "glass_minimal"
        ? "Minimalist floor-to-ceiling glass curtain wall facade with slim black aluminum mullions."
        : "High-end contemporary residential facade with textured composite panels and tempered glass balconies.";

      fullPrompt = `Photorealistic 8K architectural visualization exterior photography (ArchViz) of a ${floorCount}-storey contemporary residential building.
${edgesDescription}
Facade & Materials: ${facadeText}
Lighting & Atmosphere: ${lightingText}
Building Details: ${floorCount} storeys above ground${hasGroundFloorShop ? ` with ${shopCount} commercial street-level storefronts` : ', with an elegant residential building entrance lobby'}, cantilever balconies with transparent glass railings, recessed windows.
Environment: Modern paved sidewalk, manicured architectural landscaping, subtle street trees, clean asphalt street in foreground.
Visual Quality: Photorealistic architectural rendering, global illumination, Ray-traced glass reflections, ambient occlusion, medium-format architectural camera shot.
${customPromptNote ? `User specific requirements: ${customPromptNote}` : ""}`;
    } else {
      fullPrompt = `High-resolution architectural CAD drawing of a ${floorCount}-floor building with ${facadeWidth}m x ${facadeDepth}m dimensions, ${flatsPerFloor} apartments per floor.
${edgesDescription}
${styleDetails}
${customPromptNote ? `User specific requirements: ${customPromptNote}` : ""}`;
    }

    let generatedImageUrl: string | null = null;
    let engineUsed = "gemini_image";
    let isVectorFallback = false;

    // Check if image model is currently in quota exhaustion cooldown
    const isImageQuotaLimited = Date.now() < geminiImageQuotaExceededUntil;

    if (isImageQuotaLimited) {
      generatedImageUrl = produceVectorDrawing();
      engineUsed = "precision_cad";
      isVectorFallback = true;
    } else {
      // Try Gemini image model if preferredEngine is not forced to vector
      try {
        const imageResponse = await getGenAI().models.generateContent({
          model: "gemini-3.1-flash-lite-image",
          contents: {
            parts: [
              {
                text: fullPrompt,
              },
            ],
          },
          config: {
            imageConfig: {
              aspectRatio: aspectRatio || "4:3",
            },
          },
        });

        if (imageResponse.candidates && imageResponse.candidates[0]?.content?.parts) {
          for (const part of imageResponse.candidates[0].content.parts) {
            if (part.inlineData) {
              const mimeType = part.inlineData.mimeType || "image/png";
              const base64Str = part.inlineData.data;
              generatedImageUrl = `data:${mimeType};base64,${base64Str}`;
              break;
            }
          }
        }
      } catch (aiError: any) {
        // Quota limit (429 / RESOURCE_EXHAUSTED / free tier 0 limit) or API billing error
        const isQuota429 =
          aiError?.status === "RESOURCE_EXHAUSTED" ||
          aiError?.error?.code === 429 ||
          aiError?.message?.includes("429") ||
          aiError?.message?.includes("Quota exceeded");

        if (isQuota429) {
          // Set cooldown for 60 seconds to avoid repeating 429 errors
          geminiImageQuotaExceededUntil = Date.now() + 60 * 1000;
        }

        // Seamless fallback to the architectural CAD engine
        generatedImageUrl = produceVectorDrawing();
        engineUsed = "precision_cad";
        isVectorFallback = true;
      }
    }

    // If AI model returned empty or text-only without image data, fallback to vector CAD
    if (!generatedImageUrl) {
      generatedImageUrl = produceVectorDrawing();
      engineUsed = "precision_cad";
      isVectorFallback = true;
    }

    res.json({
      success: true,
      imageUrl: generatedImageUrl,
      engineUsed,
      isVectorFallback,
      promptUsed: fullPrompt,
      metadata: {
        drawingType,
        styleTheme,
        aspectRatio,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Nano Banana Drawing Generator Error:", error);
    // Return vector drawing even on unexpected server failure so the user never faces a broken screen
    try {
      const {
        projectData = {},
        drawingType = "floor_plan",
        styleTheme = "modern_architectural",
        aspectRatio = "4:3",
      } = req.body || {};
      const fallbackSvg = generateArchitecturalSvgDrawing(projectData, drawingType, styleTheme, aspectRatio);
      const base64 = Buffer.from(fallbackSvg, "utf-8").toString("base64");
      return res.json({
        success: true,
        imageUrl: `data:image/svg+xml;base64,${base64}`,
        engineUsed: "precision_cad",
        isVectorFallback: true,
        metadata: {
          drawingType,
          styleTheme,
          aspectRatio,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (innerErr: any) {
      res.status(500).json({
        success: false,
        error: error.message || "Bilinmeyen bir hata oluştu",
      });
    }
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

