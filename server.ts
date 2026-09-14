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

// Quota tracking to prevent unnecessary 429 exceptions when image model quota is exhausted
let geminiImageQuotaExceededUntil = 0;

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

    const response = await getGenAI().models.generateContent({
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

