import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { GoogleGenAI } from "@google/genai";
import { validateChatPrompt } from "./content-safety";

export async function vortexBrain({
  message,
  educationLevel,
  classYear,
  course,
  ragContext,
  history = [],
  image,
}: {
  message: string;
  educationLevel: string;
  classYear: string;
  course: string;
  ragContext?: string;
  history?: { role: string; content: string }[];
  image?: { data: string; mimeType: string } | null;
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || "";

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in the environment");
  }

  // Content safety & child protection pre-check
  const safetyCheck = validateChatPrompt(message);
  if (!safetyCheck.isSafe) {
    return `⚠️ **Academic Safety Guard**: ${safetyCheck.reason}`;
  }

  // System Prompt for Nigerian Student Second Brain with Strict Safety & 6-Year Degree Depth
  const systemInstruction = `You are VORTEX AI, an advanced, highly capable Second Brain for Nigerian students across all academic levels. Student details: Level=${educationLevel || "General"}, Class=${classYear || "General"}, Course=${course || "General"}.
Pedagogical & Safety Mandates:
- Child Protection & Content Moderation: Absolute zero-tolerance for sexually explicit, adult, pornographic, violent, or child-harming content. If asked for anything inappropriate or non-academic, politely refuse and redirect to curricular topics.
- Primary / Foundational levels: Clear, concise, structured, and easy-to-understand explanations. Professional, respectful, and direct. Do NOT use childish emojis, patronizing baby talk, or exaggerated hype.
- JSS / SSS levels: Aligned with WAEC, NECO, and JAMB curriculum standards, clear definitions, worked examples, and high-yield examination tips.
- University / Polytechnic levels: Deep academic rigor, structured theory, clean code snippets with explanations, mathematical formulations, and exact citations.
- 5-Year & 6-Year Professional Degrees (e.g. Medicine & Surgery MBBS, Veterinary Medicine DVM, Pharmacy PharmD, Dentistry BDS, Engineering B.Eng, Law LL.B): Provide senior clinical and professional depth. For 500L/600L medical and veterinary students, emphasize pathophysiological mechanisms, differential diagnosis, clinical pharmacokinetics, surgical landmarks, and professional board exam preparation (e.g., 1st/2nd/3rd MB, Veterinary Council Exams, Pharmacists Council of Nigeria).
- Exam Past Questions & Image Problem Solving: When a student sends or attaches a picture of a past question (WAEC, JAMB, University exam, math formula, circuit diagram, or histology slide): Transcribe the exact question text, identify the core principles tested, and solve the problem step-by-step with clear formulas, working, calculations, and final answers.
- When document context (ragContext) is provided, ground explanations in the student's materials and cite [Source: my notes]. Maintain an empowering, intellectual second-brain persona.`;

  // Build current student query with RAG context
  let currentPrompt = "";
  if (ragContext && ragContext.trim().length > 0) {
    currentPrompt += `[CONTEXT FROM STUDENT NOTES & MATERIALS]:\n${ragContext.trim()}\n\n`;
  }
  const promptText = message && message.trim().length > 0
    ? message.trim()
    : image
    ? "Please transcribe and solve this exam past question / problem step-by-step with complete working and explanations."
    : "Hello";
  currentPrompt += `[STUDENT QUERY]:\n${promptText}`;

  // Prepare multimodal content parts
  let base64Clean = "";
  let cleanMimeType = "image/jpeg";
  if (image && image.data) {
    if (image.data.startsWith("data:")) {
      const match = image.data.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        cleanMimeType = match[1] || image.mimeType || "image/jpeg";
        base64Clean = match[2];
      } else {
        base64Clean = image.data.split("base64,")[1] || image.data;
        cleanMimeType = image.mimeType || "image/jpeg";
      }
    } else {
      base64Clean = image.data;
      cleanMimeType = image.mimeType || "image/jpeg";
    }
  }

  const supportedModels = [
    "gemini-3.8-flash",
    "gemini-2.5-flash",
    "gemini-flash-latest",
  ];

  let lastError: any = null;

  // 1. Primary: modern @google/genai SDK
  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Build chat contents with history & optional image part
    const chatContents: any[] = [];
    if (history && Array.isArray(history)) {
      for (const item of history) {
        const role = item.role === "assistant" || item.role === "model" ? "model" : "user";
        if (item.content && item.content.trim()) {
          chatContents.push({ role, parts: [{ text: item.content }] });
        }
      }
    }

    const currentUserParts: any[] = [];
    if (image && base64Clean) {
      currentUserParts.push({
        inlineData: {
          mimeType: cleanMimeType,
          data: base64Clean,
        },
      });
    }
    currentUserParts.push({ text: currentPrompt });
    chatContents.push({ role: "user", parts: currentUserParts });

    for (const modelName of supportedModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: chatContents,
          config: {
            systemInstruction,
          },
        });

        if (response.text && response.text.trim().length > 0) {
          return response.text;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`ai.models.generateContent with ${modelName} error:`, err?.message || err);
      }
    }
  } catch (err) {
    lastError = err;
  }

  // 2. Legacy SDK fallback with @google/generative-ai
  try {
    const legacyGenAI = new GoogleGenerativeAI(apiKey);
    const legacyContents: { role: string; parts: any[] }[] = [];

    if (history && Array.isArray(history)) {
      for (const item of history) {
        const role = item.role === "assistant" || item.role === "model" ? "model" : "user";
        if (item.content) {
          legacyContents.push({ role, parts: [{ text: item.content }] });
        }
      }
    }
    
    const currentUserParts: any[] = [];
    if (image && base64Clean) {
      currentUserParts.push({
        inlineData: {
          mimeType: cleanMimeType,
          data: base64Clean,
        },
      });
    }
    currentUserParts.push({ text: currentPrompt });
    legacyContents.push({ role: "user", parts: currentUserParts });

    for (const modelName of supportedModels) {
      try {
        const model = legacyGenAI.getGenerativeModel({
          model: modelName,
          systemInstruction,
          safetySettings: [
            {
              category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
              threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
              threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_HARASSMENT,
              threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
              threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
            },
          ],
        });

        const result = await model.generateContent({
          contents: legacyContents,
        });

        const responseText = result.response.text();
        if (responseText && responseText.trim().length > 0) {
          return responseText;
        }
      } catch (err: any) {
        lastError = err;
      }
    }
  } catch (err) {
    lastError = err;
  }

  throw new Error(`Failed to generate response from VORTEX AI: ${lastError?.message || "All models unavailable"}`);
}
