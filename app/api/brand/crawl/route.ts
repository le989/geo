import { NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const BASE_URL = "https://www.kjtchina.com";

type CrawledProduct = {
  url: string;
  name?: string;
  desc?: string;
  rawText?: string;
};

async function fetchWithRetry(url: string, retries = 3): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get<string>(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
        timeout: 10000,
      });
      return response.data;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error('Failed to fetch after retries');
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    const targetUrl = url || `${BASE_URL}/list-product.html`;

    console.log(`[CRAWL] Starting deep crawl from: ${targetUrl}`);

    // 1. 抓取产品中心主页，获取所有产品分类链接
    const mainPageData = await fetchWithRetry(targetUrl);
    const $main = cheerio.load(mainPageData);
    
    const categoryLinks: string[] = [];
    // 假设分类链接在特定的选择器下，根据凯基特官网结构调整
    // 凯基特官网产品列表通常在左侧菜单或主内容区
    $main("a").each((_, el) => {
      const href = $main(el).attr("href");
      if (href && (href.includes("/product-") || href.includes("list-"))) {
        const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;
        if (!categoryLinks.includes(fullUrl) && fullUrl !== targetUrl) {
          categoryLinks.push(fullUrl);
        }
      }
    });

    // 限制分类数量，避免请求过多
    const limitedCategories = categoryLinks.slice(0, 10);
    console.log(`[CRAWL] Found ${categoryLinks.length} categories, crawling top ${limitedCategories.length}`);

    const allProductsData: CrawledProduct[] = [];

    // 2. 逐个进入分类页抓取产品信息
    for (const catUrl of limitedCategories) {
      try {
        console.log(`[CRAWL] Crawling category: ${catUrl}`);
        const catPageData = await fetchWithRetry(catUrl);
        const $cat = cheerio.load(catPageData);
        
        // 提取分类下的产品信息
        // 根据官网结构，产品通常在列表项中
        $cat(".product-item, .list-item, .item").each((_, el) => {
          const name = $cat(el).find("h3, h4, .title").text().trim();
          const desc = $cat(el).find(".desc, .intro, p").text().trim();
          if (name) {
            allProductsData.push({ name, desc, url: catUrl });
          }
        });

        // 如果没找到特定结构的 item，则抓取整个页面文本作为参考
        if (allProductsData.length < 5) {
          const pageText = $cat("body").text().replace(/\s+/g, " ").trim().substring(0, 2000);
          allProductsData.push({ rawText: pageText, url: catUrl });
        }
      } catch (err) {
        console.error(`[CRAWL] Failed to crawl ${catUrl}`, err);
      }
    }

    // 3. 用 DeepSeek 整理成结构化数据
    const systemPrompt = `你是一个专业的工业自动化品牌分析师。我会给你一段从凯基特(KJT)官网抓取的多层级产品数据。
请你根据这些零散的信息，整理出结构化的「品牌底座」内容。

请输出 JSON 格式，包含以下字段：
- name: "凯基特 (KJT)"
- intro: 品牌标准介绍（基于抓取内容，强调工业传感器领域的专业性）
- productLines: 核心产品线（格式：产品系列名称 - 代表型号 - 核心参数如防护等级、检测距离等）
- scenes: 典型应用场景（结合产品特性列出具体的工业应用环境，如：钢铁厂高温检测、食品包装线、立体仓库等）
- sources: 数据来源（填入抓取的主要 URL 列表，用逗号分隔）

要求：
- 信息要极其具体，必须包含型号和技术参数。
- 语言要专业、工业化。
- 直接输出 JSON，不要有其他解释。`;

    const userContent = allProductsData.map(p => 
      p.rawText ? `来源 ${p.url}: ${p.rawText}` : `来源 ${p.url}: 产品名: ${p.name}, 描述: ${p.desc}`
    ).join("\n\n").substring(0, 15000);

    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `抓取到的原始数据：\n\n${userContent}` },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");
    result.count = limitedCategories.length; // 返回抓取的系列数量

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("[CRAWL_API_ERROR]:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      { error: `深度抓取失败: ${message}` },
      { status: 500 }
    );
  }
}
