import { NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";
import OpenAI from "openai";
import { db } from "@/lib/db";
import brandProfileUtils from "@/lib/brand-profile";

const { normalizeBrandProfilePayload, sanitizeCrawledText } = brandProfileUtils as {
  normalizeBrandProfilePayload: (values: Record<string, unknown>) => {
    name: string;
    intro: string;
    productLines: string;
    scenes: string;
    forbidden: string;
    sources: string;
  };
  sanitizeCrawledText: (text: string) => string;
};

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const BASE_URL = "https://www.kjtchina.com";
const MAX_CATEGORY_PAGES = 8;
const MAX_TEXT_LENGTH = 16000;
const FIELD_LABELS: Record<string, string> = {
  name: "品牌名称",
  intro: "品牌简介",
  productLines: "产品线与代表型号",
  scenes: "典型应用场景",
  forbidden: "禁止表述",
  sources: "可引用来源",
};

const DIFF_FIELDS = Object.keys(FIELD_LABELS) as Array<keyof ReturnType<typeof normalizeBrandProfilePayload>>;

type CrawlChunk = {
  url: string;
  title: string;
  text: string;
};

async function fetchWithRetry(url: string, retries = 3): Promise<string> {
  for (let index = 0; index < retries; index += 1) {
    try {
      const response = await axios.get<string>(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
        },
        timeout: 12000,
      });
      return response.data;
    } catch (error) {
      if (index === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error("抓取失败");
}

function toAbsoluteUrl(href: string) {
  if (href.startsWith("http")) return href;
  return `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;
}

function extractReadableText(html: string) {
  const $ = cheerio.load(html);
  $("script, style, noscript, header, footer, nav, .header, .footer, .nav, .breadcrumbs, .breadcrumb").remove();
  const title = $("title").first().text().trim();
  const mainText = $("main, article, .content, .main, .container, body")
    .first()
    .text();
  return {
    title,
    text: sanitizeCrawledText(mainText).slice(0, 2500),
  };
}

function collectCandidateLinks(html: string, targetUrl: string) {
  const $ = cheerio.load(html);
  const links = new Set<string>();

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (!href) return;
    if (!href.includes("product") && !href.includes("list") && !href.includes("sensor")) return;

    const fullUrl = toAbsoluteUrl(href);
    if (fullUrl !== targetUrl) {
      links.add(fullUrl);
    }
  });

  return Array.from(links).slice(0, MAX_CATEGORY_PAGES);
}

async function summarizeBrand(chunks: CrawlChunk[]) {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error("DeepSeek API Key 未配置");
  }

  const merged = chunks
    .map((chunk) => `URL: ${chunk.url}\n标题: ${chunk.title || "未命名页面"}\n正文: ${chunk.text}`)
    .join("\n\n---\n\n")
    .slice(0, MAX_TEXT_LENGTH);

  const completion = await openai.chat.completions.create({
    model: "deepseek-chat",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          "你负责把品牌官网抓取内容整理成可用于 AI 内容生产的品牌资料。",
          "只输出 JSON 对象，不要输出解释。",
          "字段固定为 name、intro、productLines、scenes、forbidden、sources。",
          "要求：",
          "1. intro 写成 2 到 4 句品牌简介，只保留品牌事实，不写营销套话。",
          "2. productLines 按一行一个要点输出，尽量写成‘产品系列 - 代表型号/特点’。",
          "3. scenes 按一行一个典型工业场景输出。",
          "4. forbidden 输出生成内容时应避免的表述，至少给 3 条。",
          "5. sources 只保留可引用的主要 URL，一行一个。",
          "6. 如果信息不足，不要编造，用现有内容概括。",
        ].join("\n"),
      },
      {
        role: "user",
        content: `请根据以下官网内容整理品牌资料：\n\n${merged}`,
      },
    ],
  });

  const parsed = JSON.parse(completion.choices[0].message.content || "{}");
  return normalizeBrandProfilePayload(parsed);
}

function buildDiffs(currentProfile: ReturnType<typeof normalizeBrandProfilePayload>, previewProfile: ReturnType<typeof normalizeBrandProfilePayload>) {
  return DIFF_FIELDS.map((fieldKey) => {
    const oldValue = currentProfile[fieldKey] ?? "";
    const newValue = previewProfile[fieldKey] ?? "";
    return {
      fieldKey,
      label: FIELD_LABELS[fieldKey],
      oldValue,
      newValue,
      changed: oldValue !== newValue,
    };
  });
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    const targetUrl = url || `${BASE_URL}/list-product.html`;

    const mainPageHtml = await fetchWithRetry(targetUrl);
    const mainPage = extractReadableText(mainPageHtml);
    const links = collectCandidateLinks(mainPageHtml, targetUrl);

    const chunks: CrawlChunk[] = [{ url: targetUrl, title: mainPage.title, text: mainPage.text }];

    for (const link of links) {
      try {
        const html = await fetchWithRetry(link);
        const page = extractReadableText(html);
        if (page.text) {
          chunks.push({ url: link, title: page.title, text: page.text });
        }
      } catch (error) {
        console.warn(`[BRAND_CRAWL_WARN] ${link}`, error);
      }
    }

    const preview = await summarizeBrand(chunks);
    preview.sources = normalizeBrandProfilePayload({ sources: chunks.map((item) => item.url).join("\n") }).sources;

    const currentProfileRaw = (await db.brandProfile.findFirst()) || {
      name: "",
      intro: "",
      productLines: "",
      scenes: "",
      forbidden: "",
      sources: "",
    };
    const currentProfile = normalizeBrandProfilePayload(currentProfileRaw);
    const diffs = buildDiffs(currentProfile, preview);

    return NextResponse.json({
      preview,
      diffs,
      count: chunks.length,
      crawledUrls: chunks.map((item) => item.url),
      changedCount: diffs.filter((item) => item.changed).length,
    });
  } catch (error: unknown) {
    console.error("[CRAWL_API_ERROR]", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: `抓取失败：${message}` }, { status: 500 });
  }
}
