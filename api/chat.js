import { GoogleGenAI } from "@google/genai";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const PROMPT_FILES = {
  searchmode: "prompts/searchmode_251124.txt",
  "ailey-debate": "prompts/ailey-debate-v1213.txt",
  "ailey-bailey-x": "prompts/ailey-bailey-x-251023.txt"
};

const DEFAULT_PROMPT_ID = "searchmode";
const ALLOWED_THINKING = new Set(["low", "medium", "high"]);
const MAX_MESSAGES = 40;
const promptCache = new Map();
const ONLINE_THRESHOLD = new Date("2025-11-23T00:00:00+09:00");

function getAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS;
  if (!raw) return ["https://ggumtak.github.io"];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function setCors(res, origin) {
  if (!origin) return;
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "600");
}

function resolvePath(relativePath) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.resolve(__dirname, "..", relativePath);
}

async function getPromptText(promptId) {
  const file = PROMPT_FILES[promptId];
  if (!file) return "";
  if (promptCache.has(file)) return promptCache.get(file);
  try {
    const text = await readFile(resolvePath(file), "utf8");
    promptCache.set(file, text);
    return text;
  } catch (err) {
    console.warn("[api/chat] prompt load failed", err);
    return "";
  }
}

function normalizeMessages(input) {
  if (!Array.isArray(input)) return [];
  return input
    .filter((msg) => msg && (msg.role === "user" || msg.role === "model") && typeof msg.text === "string")
    .map((msg) => ({
      role: msg.role,
      text: msg.text.trim()
    }))
    .filter((msg) => msg.text)
    .slice(-MAX_MESSAGES);
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();
  if (origin && !allowedOrigins.includes(origin)) {
    res.status(403).json({ error: "Origin not allowed" });
    return;
  }
  setCors(res, origin);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server API key missing" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (_) {
      res.status(400).json({ error: "Invalid JSON body" });
      return;
    }
  }

  const messages = normalizeMessages(body?.messages);
  if (!messages.length) {
    res.status(400).json({ error: "Messages required" });
    return;
  }

  const requestedPromptId = typeof body?.promptId === "string" ? body.promptId : DEFAULT_PROMPT_ID;
  const promptId = PROMPT_FILES[requestedPromptId] ? requestedPromptId : DEFAULT_PROMPT_ID;
  const thinkingLevel = ALLOWED_THINKING.has(body?.thinkingLevel) ? body.thinkingLevel : "medium";
  const model = typeof body?.model === "string" && body.model.trim()
    ? body.model.trim()
    : "gemini-3-flash-preview";
  const useSearchTool = body?.useSearchTool !== false;
  const now = new Date();
  const onlineMode = now >= ONLINE_THRESHOLD;
  const nowIso = now.toISOString();
  const nowKst = now.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

  try {
    const promptText = await getPromptText(promptId);
    if (!promptText) {
      console.warn("[api/chat] prompt missing", { promptId, requestedPromptId });
    }
    const ai = new GoogleGenAI({ apiKey });
    const baseConfig = {
      thinkingConfig: { thinkingLevel }
    };
    const runtimeBanner = [
      "[RUNTIME STATUS]",
      `SERVER_TIME_ISO=${nowIso}`,
      `SERVER_TIME_KST=${nowKst}`,
      `ONLINE_MODE=${onlineMode ? "true" : "false"}`,
      `SEARCH_TOOL_ENABLED=${useSearchTool ? "true" : "false"}`
    ].join("\n");
    if (promptText) {
      baseConfig.systemInstruction = `${runtimeBanner}\n\n${promptText}`;
    } else {
      baseConfig.systemInstruction = runtimeBanner;
    }
    if (useSearchTool) baseConfig.tools = [{ type: "google_search" }];

    const contents = messages.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }));

    let response;
    let searchFallback = false;
    try {
      response = await ai.models.generateContent({
        model,
        contents,
        config: baseConfig
      });
    } catch (err) {
      if (useSearchTool) {
        searchFallback = true;
        response = await ai.models.generateContent({
          model,
          contents,
          config: promptText ? { ...baseConfig, tools: undefined } : { thinkingConfig: { thinkingLevel } }
        });
      } else {
        throw err;
      }
    }

    res.status(200).json({
      text: response?.text || "",
      model: response?.modelVersion || model,
      meta: {
        promptId,
        requestedPromptId,
        promptChars: promptText.length,
        thinkingLevel,
        searchEnabled: useSearchTool,
        searchFallback,
        onlineMode,
        serverTime: nowIso
      }
    });
  } catch (err) {
    console.warn("[api/chat] request failed", err);
    res.status(500).json({ error: "Gemini request failed" });
  }
}
