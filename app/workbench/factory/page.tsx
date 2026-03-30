
"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import nextDynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Copy,
  Crosshair,
  Loader2,
  Save,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import contentText from "@/lib/content-text";
import { buildBatchVariationSpecs } from "@/lib/batch-variation";

const MDEditor = nextDynamic(() => import("@uiw/react-md-editor").then((mod) => mod.default), {
  ssr: false,
});

const PENDING_TASK_STORAGE_KEY = "gf_factory_pending_task_id";

const { cleanCopiedArticleText } = contentText as {
  cleanCopiedArticleText: (text: string) => string;
};

type TaskStatus =
  | "IDLE"
  | "PENDING_GENERATE"
  | "GENERATING"
  | "PENDING_REVIEW"
  | "NEEDS_REVISION"
  | "COMPLETED"
  | "FAILED";

type TopicTemplate = {
  id: string;
  topic: string;
  scene: string;
  channel: string;
  priority: string;
};

type KeywordAsset = {
  id: string;
  keyword: string;
  scene: string;
  groupName: string;
  priority: string;
  usageCount: number;
  active: boolean;
};

type TopicSuggestionItem = {
  id: string;
  keyword: string;
  title: string;
  scene?: string;
  channel?: string;
  reason?: string;
  score?: number;
};

type ModelOption = {
  id: string;
  name: string;
  provider: string;
  modelName: string;
  isDefault: boolean;
};

type ScoreDimension = {
  key: string;
  label: string;
  weight: number;
  score: number;
  maxScore: number;
  reason: string;
  tips: string[];
  description: string;
};

type ScoreResult = {
  total: number;
  dimensions: ScoreDimension[];
  suggestion: string;
  items?: Array<{
    name: string;
    score: number;
    max: number;
    tip: string;
  }>;
};

type ReviewResult = {
  status?: string;
  summary?: string;
  issues?: Array<string | { text: string; paragraphIndex?: number }>;
  suggestions?: string[];
};

type PublishCheckItem = {
  key: string;
  level: string;
  label: string;
  detail: string;
};

type BrandReferenceItem = {
  type: string;
  label: string;
  excerpt: string;
};

type BrandRiskItem = {
  term: string;
  reason: string;
};

type BrandCheckResult = {
  references: BrandReferenceItem[];
  risks: BrandRiskItem[];
  referenceCount: number;
  riskCount: number;
  suggestedSources: string[];
};

type BrandAnnotation = {
  id: string;
  type: "brand_mention" | "forbidden" | "source_hint" | "fact_drift";
  level: "ok" | "warning" | "danger" | "info";
  start: number;
  end: number;
  text: string;
  message: string;
};

type BrandMetrics = {
  brandMentionCount: number;
  sceneCovered: number;
  sceneTotal: number;
  forbiddenCount: number;
  sourceCount: number;
};

type PublishCheckResult = {
  status?: string;
  items?: PublishCheckItem[];
  recommendedAction?: string;
  brandCheck?: BrandCheckResult;
};

type ContentVersion = {
  id: string;
  versionNumber: number;
  title: string;
  content: string;
  source: string;
  actor: string;
  createdAt: string;
};

type ContentSampleReference = {
  id: string;
  taskId: string;
  title: string;
  channel: string;
  scene: string;
  reason: string;
  excerpt: string;
};

type PreviewParagraph = {
  index: number;
  text: string;
  nodes: Array<JSX.Element>;
};

type ReviewIssueItem = {
  text: string;
  paragraphIndex?: number;
};

const CHANNEL_OPTIONS = ["\u77e5\u4e4e", "\u767e\u5bb6\u53f7", "\u4eca\u65e5\u5934\u6761", "\u641c\u72d0\u53f7", "\u7f51\u6613\u53f7"];
const CONTENT_TYPE_OPTIONS = ["\u81ea\u52a8\u8bc6\u522b", "\u7ecf\u9a8c\u5206\u4eab", "\u9009\u578b\u6307\u5357", "\u6848\u4f8b\u89e3\u6790", "\u53c2\u6570\u5bf9\u6bd4", "\u95ee\u7b54\u6587\u7ae0"];
const ALL_SCENES = "\u5168\u90e8\u573a\u666f";
const BATCH_VARIATION_OPTIONS = [
  { key: "angle", label: "\u89d2\u5ea6", hint: "\u8ba9\u5404\u7bc7\u5185\u5bb9\u4ece\u4e0d\u540c\u5207\u5165\u70b9\u5c55\u5f00" },
  { key: "audience", label: "\u53d7\u4f17", hint: "\u9488\u5bf9\u4e0d\u540c\u8bfb\u8005\u89d2\u8272\u8c03\u6574\u8868\u8fbe" },
  { key: "opening", label: "\u5f00\u5934\u98ce\u683c", hint: "\u4f7f\u7528\u4e0d\u540c\u7684\u5f00\u573a\u65b9\u5f0f\u964d\u4f4e\u91cd\u590d" },
] as const;

const SOURCE_TYPE_LABELS: Record<string, string> = {
  manual: "\u624b\u52a8\u521b\u5efa",
  topic: "\u9009\u9898\u5e93",
  keyword: "\u5173\u952e\u8bcd",
  brand: "\u54c1\u724c\u8d44\u6599",
  monitor: "\u76d1\u6d4b\u53d1\u73b0",
  sample: "\u6837\u677f\u590d\u7528",
};

const REVIEW_STATUS_LABELS: Record<string, string> = {
  pass: "\u53ef\u8fdb\u5165\u5ba1\u6838",
  revise: "\u5efa\u8bae\u4fee\u6539",
  high_risk: "\u9ad8\u98ce\u9669",
};

const REVIEW_STATUS_STYLES: Record<string, string> = {
  pass: "bg-emerald-50 text-emerald-700",
  revise: "bg-amber-50 text-amber-700",
  high_risk: "bg-rose-50 text-rose-700",
};

const CHECK_LEVEL_LABELS: Record<string, string> = {
  pass: "\u901a\u8fc7",
  warning: "\u63d0\u9192",
  fail: "\u963b\u65ad",
};

const CHECK_LEVEL_STYLES: Record<string, string> = {
  pass: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  fail: "bg-rose-50 text-rose-700",
};

const ANNOTATION_STYLES: Record<BrandAnnotation["type"], string> = {
  brand_mention: "rounded px-0.5 underline decoration-emerald-500 decoration-2 underline-offset-4",
  forbidden: "rounded bg-rose-100 px-0.5 text-rose-700",
  source_hint: "rounded px-0.5 underline decoration-sky-500 decoration-2 underline-offset-4 decoration-dashed",
  fact_drift: "rounded bg-amber-100 px-0.5 text-amber-800",
};

function metricTone(value: number, type: "danger" | "normal" = "normal") {
  if (type === "danger" && value > 0) return "text-rose-600";
  return "text-slate-900";
}

function statusLabel(status: TaskStatus) {
  return {
    IDLE: "\u5f85\u5f00\u59cb",
    PENDING_GENERATE: "\u751f\u6210\u4e2d",
    GENERATING: "\u751f\u6210\u4e2d",
    PENDING_REVIEW: "\u5f85\u5ba1\u6838",
    NEEDS_REVISION: "\u5f85\u8fd4\u5de5",
    COMPLETED: "\u5df2\u5b8c\u6210",
    FAILED: "\u5931\u8d25",
  }[status] || status;
}

function normalizeReviewIssues(issues: ReviewResult["issues"]): ReviewIssueItem[] {
  if (!Array.isArray(issues)) return [];
  return issues
    .map((item) => {
      if (typeof item === "string") {
        const text = item.trim();
        return text ? { text } : null;
      }
      if (item && typeof item === "object" && typeof item.text === "string") {
        const text = item.text.trim();
        if (!text) return null;
        return {
          text,
          paragraphIndex: Number.isInteger(item.paragraphIndex) ? item.paragraphIndex : undefined,
        };
      }
      return null;
    })
    .filter((item): item is ReviewIssueItem => Boolean(item));
}

async function readJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(data?.error || data?.message || "Request failed");
  }
  return data as T;
}

export default function FactoryPage() {
  const router = useRouter();
  const hydratedQueryRef = useRef(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const paragraphRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const highlightTimerRef = useRef<number | null>(null);

  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<TaskStatus>("IDLE");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState("\u77e5\u4e4e");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [selectedContentType, setSelectedContentType] = useState("\u81ea\u52a8\u8bc6\u522b");
  const [selectedTopicScene, setSelectedTopicScene] = useState("");
  const [sourceType, setSourceType] = useState("manual");
  const [sourceLabel, setSourceLabel] = useState("");
  const [lastEditedAt, setLastEditedAt] = useState<string | null>(null);

  const [score, setScore] = useState<ScoreResult | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const [brandCheck, setBrandCheck] = useState<BrandCheckResult | null>(null);
  const [isBrandChecking, setIsBrandChecking] = useState(false);
  const [brandAnnotations, setBrandAnnotations] = useState<BrandAnnotation[]>([]);
  const [brandMetrics, setBrandMetrics] = useState<BrandMetrics | null>(null);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [aiReview, setAiReview] = useState<ReviewResult | null>(null);
  const [publishCheck, setPublishCheck] = useState<PublishCheckResult | null>(null);
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [sampleReferences, setSampleReferences] = useState<ContentSampleReference[]>([]);
  const [activeParagraphIndex, setActiveParagraphIndex] = useState<number | null>(null);

  const [topics, setTopics] = useState<TopicTemplate[]>([]);
  const [keywords, setKeywords] = useState<KeywordAsset[]>([]);
  const [topicSuggestions, setTopicSuggestions] = useState<TopicSuggestionItem[]>([]);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [scenes, setScenes] = useState<string[]>([]);
  const [filterScene, setFilterScene] = useState(ALL_SCENES);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [keywordsLoading, setKeywordsLoading] = useState(true);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [samplesLoading, setSamplesLoading] = useState(true);
  const [showScoreDetails, setShowScoreDetails] = useState(false);
  const [expandedScoreDimension, setExpandedScoreDimension] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null);
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [batchSelectedIds, setBatchSelectedIds] = useState<string[]>([]);
  const [batchUnified, setBatchUnified] = useState(true);
  const [batchUnifiedChannel, setBatchUnifiedChannel] = useState("\u77e5\u4e4e");
  const [batchUnifiedType, setBatchUnifiedType] = useState("\u81ea\u52a8\u8bc6\u522b");
  const [batchVariationDimensions, setBatchVariationDimensions] = useState<string[]>([]);
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const handleScore = useCallback(async (content: string) => {
    if (!content.trim()) return;
    setIsScoring(true);
    try {
      const nextScore = await readJson<ScoreResult>("/api/generate/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      setScore(nextScore);
    } catch (error) {
      console.warn("[SCORE_ERROR]", error);
      setScore(null);
    } finally {
      setIsScoring(false);
    }
  }, []);

  const handleBrandCheck = useCallback(async (content: string) => {
    if (!content.trim()) return;
    setIsBrandChecking(true);
    try {
      const nextBrandCheck = await readJson<BrandCheckResult>("/api/brand/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      setBrandCheck(nextBrandCheck);
    } catch (error) {
      console.warn("[BRAND_CHECK_ERROR]", error);
      setBrandCheck(null);
    } finally {
      setIsBrandChecking(false);
    }
  }, []);

  const handleBrandAnnotations = useCallback(
    async (content: string, currentTaskId?: string | null) => {
      if (!currentTaskId || !content.trim()) {
        setBrandAnnotations([]);
        setBrandMetrics(null);
        return;
      }

      setIsAnnotating(true);
      try {
        const data = await readJson<{ annotations: BrandAnnotation[]; metrics: BrandMetrics }>("/api/v1/articles/" + currentTaskId + "/brand-annotations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        setBrandAnnotations(Array.isArray(data.annotations) ? data.annotations : []);
        setBrandMetrics(data.metrics || null);
      } catch (error) {
        console.warn("[BRAND_ANNOTATIONS_ERROR]", error);
        setBrandAnnotations([]);
        setBrandMetrics(null);
      } finally {
        setIsAnnotating(false);
      }
    },
    []
  );

  const hydrateContent = useCallback(
    (detail: Record<string, any>) => {
      setTaskId(detail.id || null);
      setTitle(detail.title || "");
      setResult(detail.content || "");
      setSelectedChannel(detail.channel || "\u77e5\u4e4e");
      setSelectedTopicScene(detail.scene || "");
      setStatus((detail.status as TaskStatus) || "PENDING_REVIEW");
      setSourceType(detail.source?.type || detail.sourceType || "manual");
      setSourceLabel(detail.source?.label || detail.sourceLabel || "");
      setLastEditedAt(detail.lastEditedAt || detail.updatedAt || null);
      setAiReview((detail.review || detail.aiReview || null) as ReviewResult | null);
      setPublishCheck((detail.check || detail.publishCheck || null) as PublishCheckResult | null);
      setBrandCheck((detail.check?.brandCheck || detail.publishCheck?.brandCheck || null) as BrandCheckResult | null);
      setVersions(Array.isArray(detail.versions) ? detail.versions : []);
    },
    []
  );

  const fetchContentDetail = useCallback(
    async (id: string) => {
      const detail = await readJson<Record<string, any>>(`/api/content/${id}`);
      hydrateContent(detail);
      if (detail.content) {
        void handleScore(detail.content);
      }
    },
    [handleScore, hydrateContent]
  );

  const pollTaskStatus = useCallback(
    async (id: string) => {
      try {
        const task = await readJson<Record<string, any>>(`/api/tasks/${id}`);
        setStatus((task.status as TaskStatus) || "GENERATING");

        if (task.status === "FAILED") {
          stopPolling();
          setLoading(false);
          setResult(task.content || "");
          setTitle(task.title || "");
          window.localStorage.removeItem(PENDING_TASK_STORAGE_KEY);
          return;
        }

        if (task.status === "PENDING_REVIEW" || task.status === "COMPLETED") {
          stopPolling();
          setLoading(false);
          window.localStorage.removeItem(PENDING_TASK_STORAGE_KEY);
          await fetchContentDetail(id);
        }
      } catch (error) {
        console.warn("[TASK_POLL_ERROR]", error);
      }
    },
    [fetchContentDetail, stopPolling]
  );

  const startPolling = useCallback(
    (id: string) => {
      stopPolling();
      pollingRef.current = setInterval(() => {
        void pollTaskStatus(id);
      }, 2000);
      void pollTaskStatus(id);
    },
    [pollTaskStatus, stopPolling]
  );

  const fetchModels = useCallback(async () => {
    try {
      const data = await readJson<{ models: ModelOption[] }>("/api/models");
      setModels(data.models || []);
      const defaultModel = (data.models || []).find((item) => item.isDefault);
      if (defaultModel) {
        setSelectedModelId((current) => current || defaultModel.id);
      }
    } catch (error) {
      console.warn("[MODELS_GET_ERROR]", error);
      setModels([]);
    }
  }, []);

  const fetchTopics = useCallback(async () => {
    setTopicsLoading(true);
    try {
      const data = await readJson<TopicTemplate[]>("/api/topics");
      setTopics(Array.isArray(data) ? data : []);
      const nextScenes = Array.from(new Set((Array.isArray(data) ? data : []).map((item) => item.scene).filter(Boolean)));
      setScenes(nextScenes);
      setSelectedTopicScene((current) => current || nextScenes[0] || "");
    } catch (error) {
      console.warn("[TOPICS_GET_ERROR]", error);
      setTopics([]);
      setScenes([]);
    } finally {
      setTopicsLoading(false);
    }
  }, []);

  const fetchKeywords = useCallback(async () => {
    setKeywordsLoading(true);
    try {
      const data = await readJson<KeywordAsset[]>("/api/keywords");
      setKeywords(Array.isArray(data) ? data : []);
    } catch (error) {
      console.warn("[KEYWORDS_GET_ERROR]", error);
      setKeywords([]);
    } finally {
      setKeywordsLoading(false);
    }
  }, []);

  const fetchTopicSuggestions = useCallback(async () => {
    setSuggestionsLoading(true);
    try {
      const data = await readJson<{ items: TopicSuggestionItem[] }>("/api/topics/suggestions?limit=10");
      setTopicSuggestions(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      console.warn("[TOPIC_SUGGESTIONS_GET_ERROR]", error);
      setTopicSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  }, []);

  const fetchSamples = useCallback(async () => {
    setSamplesLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedChannel) params.set("channel", selectedChannel);
      if (selectedTopicScene) params.set("scene", selectedTopicScene);
      const data = await readJson<ContentSampleReference[]>(`/api/samples?${params.toString()}`);
      setSampleReferences(Array.isArray(data) ? data.slice(0, 5) : []);
    } catch (error) {
      console.warn("[SAMPLES_GET_ERROR]", error);
      setSampleReferences([]);
    } finally {
      setSamplesLoading(false);
    }
  }, [selectedChannel, selectedTopicScene]);

  useEffect(() => {
    void fetchModels();
    void fetchTopics();
    void fetchKeywords();
    void fetchTopicSuggestions();
  }, [fetchKeywords, fetchModels, fetchTopicSuggestions, fetchTopics]);

  useEffect(() => {
    void fetchSamples();
  }, [fetchSamples]);

  useEffect(() => {
    if (hydratedQueryRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const nextTaskId = params.get("taskId");
    const nextPrompt = params.get("prompt");
    const nextScene = params.get("scene");
    const nextChannel = params.get("channel");
    const nextSourceType = params.get("sourceType");
    const nextSourceLabel = params.get("sourceLabel");

    hydratedQueryRef.current = true;

    const pendingTaskId = window.localStorage.getItem(PENDING_TASK_STORAGE_KEY);

    if (nextTaskId) {
      if (pendingTaskId === nextTaskId) {
        setTaskId(nextTaskId);
        setLoading(true);
        setStatus("GENERATING");
        startPolling(nextTaskId);
      } else {
        void fetchContentDetail(nextTaskId);
      }
      return;
    }

    if (pendingTaskId) {
      setTaskId(pendingTaskId);
      setLoading(true);
      setStatus("GENERATING");
      router.replace(`/workbench/factory?taskId=${pendingTaskId}`);
      startPolling(pendingTaskId);
      return;
    }

    if (nextPrompt) setPrompt(nextPrompt);
    if (nextScene) setSelectedTopicScene(nextScene);
    if (nextChannel) setSelectedChannel(nextChannel);
    if (nextSourceType) setSourceType(nextSourceType);
    if (nextSourceLabel) setSourceLabel(nextSourceLabel);
  }, [fetchContentDetail, router, startPolling]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  useEffect(() => {
    if (!score || score.total >= 55) {
      setShowScoreDetails(false);
      setExpandedScoreDimension(null);
    }
  }, [score]);

  useEffect(() => {
    if (!result.trim()) {
      setScore(null);
      setExpandedScoreDimension(null);
      return;
    }

    const timer = window.setTimeout(() => {
      void handleScore(result);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [handleScore, result]);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        window.clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!taskId || !result.trim()) {
      setBrandAnnotations([]);
      setBrandMetrics(null);
      return;
    }

    const timer = window.setTimeout(() => {
      void handleBrandAnnotations(result, taskId);
    }, 500);

    return () => window.clearTimeout(timer);
  }, [handleBrandAnnotations, result, taskId]);

  const previewParagraphs = useMemo<PreviewParagraph[]>(() => {
    const content = result.trim();
    if (!content) return [];

    const safeAnnotations = [...brandAnnotations]
      .filter((item) => Number.isFinite(item.start) && Number.isFinite(item.end) && item.end > item.start)
      .sort((a, b) => a.start - b.start || a.end - b.end);

    const parts = content.split(/\n\s*\n/);
    let offset = 0;

    return parts.map((paragraph, index) => {
      const startOffset = offset;
      const endOffset = startOffset + paragraph.length;
      const paragraphAnnotations = safeAnnotations.filter((item) => item.start < endOffset && item.end > startOffset);
      const nodes: Array<JSX.Element> = [];

      if (!paragraphAnnotations.length) {
        nodes.push(<span key={`plain-${index}`}>{paragraph}</span>);
      } else {
        let cursor = startOffset;
        paragraphAnnotations.forEach((item) => {
          const start = Math.max(item.start, cursor);
          const end = Math.min(item.end, endOffset);
          if (start > cursor) {
            nodes.push(<span key={`text-${index}-${cursor}`}>{content.slice(cursor, start)}</span>);
          }
          nodes.push(
            <span key={item.id} title={item.message} className={ANNOTATION_STYLES[item.type] || ""}>
              {content.slice(start, end)}
            </span>
          );
          cursor = end;
        });
        if (cursor < endOffset) {
          nodes.push(<span key={`tail-${index}-${cursor}`}>{content.slice(cursor, endOffset)}</span>);
        }
      }

      offset = endOffset + 2;
      return { index, text: paragraph, nodes };
    });
  }, [brandAnnotations, result]);

  const handleLocateIssue = useCallback((paragraphIndex?: number) => {
    if (!Number.isInteger(paragraphIndex) || paragraphIndex === null || paragraphIndex < 0) return;
    const target = paragraphRefs.current[paragraphIndex];
    if (!target) return;

    setActiveParagraphIndex(paragraphIndex);
    target.scrollIntoView({ behavior: "smooth", block: "center" });

    if (highlightTimerRef.current) {
      window.clearTimeout(highlightTimerRef.current);
    }
    highlightTimerRef.current = window.setTimeout(() => {
      setActiveParagraphIndex((current) => (current === paragraphIndex ? null : current));
      highlightTimerRef.current = null;
    }, 2000);
  }, []);

  const filteredTopics = useMemo(() => {
    return topics.filter((item) => filterScene === ALL_SCENES || item.scene === filterScene);
  }, [filterScene, topics]);

  const normalizedReviewIssues = useMemo(() => normalizeReviewIssues(aiReview?.issues), [aiReview?.issues]);
  const lowQualityWarning = useMemo(() => {
    if (!score || !Number.isFinite(score.total) || score.total >= 55) return null;
    return {
      total: score.total,
      dimensions: Array.isArray(score.dimensions) ? score.dimensions : [],
    };
  }, [score]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      alert("\u8bf7\u5148\u8f93\u5165\u521b\u4f5c\u6307\u4ee4");
      return;
    }

    setLoading(true);
    setStatus("PENDING_GENERATE");
    setScore(null);
    setAiReview(null);
    setPublishCheck(null);
    setBrandCheck(null);
    setVersions([]);

    try {
      const data = await readJson<{ taskId: string }>("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          channel: selectedChannel,
          contentType: selectedContentType,
          scene: selectedTopicScene,
          modelId: selectedModelId || undefined,
          sourceType,
          sourceLabel: sourceLabel || prompt.slice(0, 80),
        }),
      });

      setTaskId(data.taskId);
      window.localStorage.setItem(PENDING_TASK_STORAGE_KEY, data.taskId);
      router.replace(`/workbench/factory?taskId=${data.taskId}`);
      startPolling(data.taskId);
    } catch (error) {
      setLoading(false);
      setStatus("FAILED");
      alert(error instanceof Error ? error.message : "\u751f\u6210\u5931\u8d25");
    }
  }, [prompt, router, selectedChannel, selectedContentType, selectedModelId, selectedTopicScene, sourceLabel, sourceType, startPolling]);

  const handleSave = useCallback(async () => {
    if (!taskId) {
      alert("\u8bf7\u5148\u751f\u6210\u5185\u5bb9\u518d\u4fdd\u5b58");
      return;
    }

    setIsSaving(true);
    try {
      const data = await readJson<Record<string, any>>(`/api/content/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content: result }),
      });
      hydrateContent(data);
      alert("\u4fdd\u5b58\u6210\u529f");
    } catch (error) {
      alert(error instanceof Error ? error.message : "\u4fdd\u5b58\u5931\u8d25");
    } finally {
      setIsSaving(false);
    }
  }, [hydrateContent, result, taskId, title]);

  const handleRestoreVersion = useCallback(
    async (versionId: string) => {
      if (!taskId) return;
      setRestoringVersionId(versionId);
      try {
        const data = await readJson<Record<string, any>>(`/api/content/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ restoreVersionId: versionId }),
        });
        hydrateContent(data);
        alert("\u5df2\u6062\u590d\u5230\u9009\u4e2d\u7248\u672c");
      } catch (error) {
        alert(error instanceof Error ? error.message : "\u7248\u672c\u6062\u590d\u5931\u8d25");
      } finally {
        setRestoringVersionId(null);
      }
    },
    [hydrateContent, taskId]
  );

  const handleCopyPlainText = useCallback(async () => {
    const text = cleanCopiedArticleText(result || "");
    if (!text) return;
    await navigator.clipboard.writeText(text);
    alert("\u5df2\u590d\u5236\u5168\u6587");
  }, [result]);

  const handleCopyRichText = useCallback(async () => {
    const plainText = cleanCopiedArticleText(result || "");
    if (!plainText) return;

    if (typeof ClipboardItem === "undefined") {
      await navigator.clipboard.writeText(plainText);
      alert("\u5f53\u524d\u73af\u5883\u4e0d\u652f\u6301\u5bcc\u6587\u672c\uff0c\u5df2\u9000\u5316\u4e3a\u7eaf\u6587\u672c\u590d\u5236");
      return;
    }

    const html = `<p>${plainText.replace(/\n/g, "<br />")}</p>`;
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/plain": new Blob([plainText], { type: "text/plain" }),
        "text/html": new Blob([html], { type: "text/html" }),
      }),
    ]);
    alert("\u5df2\u590d\u5236\u5bcc\u6587\u672c");
  }, [result]);

  const handleBatchGenerate = useCallback(async () => {
    const selected = topics.filter((item) => batchSelectedIds.includes(item.id));
    if (selected.length === 0) {
      alert("\u8bf7\u81f3\u5c11\u9009\u62e9\u4e00\u4e2a\u9009\u9898");
      return;
    }

    try {
      setIsBatchSubmitting(true);
      const variationSpecs = buildBatchVariationSpecs(
        selected.length,
        batchVariationDimensions as Array<"angle" | "audience" | "opening">,
      );
      const body = {
        items: selected.map((item, index) => ({
          prompt: item.topic,
          channel: batchUnified ? batchUnifiedChannel : item.channel || selectedChannel,
          contentType: batchUnified ? batchUnifiedType : selectedContentType,
          scene: item.scene || selectedTopicScene,
          variationSpec: variationSpecs[index],
        })),
      };

      const data = await readJson<{
        taskIds: string[];
      }>("/api/generate/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      setIsBatchOpen(false);
      setBatchSelectedIds([]);
      alert("\u5df2\u63d0\u4ea4 " + (data.taskIds?.length || 0) + " \u6761\u6279\u91cf\u751f\u6210\u4efb\u52a1\uff0c\u540e\u53f0\u4f1a\u7ee7\u7eed\u5b8c\u6210\u751f\u6210\u5e76\u68c0\u67e5\u76f8\u4f3c\u5ea6\u3002");
    } catch (error) {
      alert(error instanceof Error ? error.message : "\u6279\u91cf\u751f\u6210\u5931\u8d25");
    } finally {
      setIsBatchSubmitting(false);
    }
  }, [batchSelectedIds, batchUnified, batchUnifiedChannel, batchUnifiedType, batchVariationDimensions, selectedChannel, selectedContentType, selectedTopicScene, topics]);

  const applyTopicSuggestion = useCallback((input: {
    title?: string;
    keyword?: string;
    scene?: string;
    channel?: string;
    sourceType?: string;
    sourceLabel?: string;
  }) => {
    const nextPrompt = (input.title || input.keyword || "").trim();
    if (nextPrompt) setPrompt(nextPrompt);
    if (input.scene) setSelectedTopicScene(input.scene);
    if (input.channel) setSelectedChannel(input.channel);
    setSourceType(input.sourceType || "keyword");
    setSourceLabel(input.sourceLabel || nextPrompt || input.keyword || "");
    setIsSuggestionOpen(false);
  }, []);

  const renderStatusBadge = useMemo(() => {
    const tone = status === "FAILED" ? "bg-rose-50 text-rose-700" : status === "PENDING_REVIEW" ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-700";
    return <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold", tone)}>{statusLabel(status)}</span>;
  }, [status]);

  return (
    <div className="space-y-6 pb-10">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_360px]">
        <div className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">{"\u5185\u5bb9\u751f\u4ea7\u5de5\u5382"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-2 text-sm text-slate-600">
                  <span>{"\u53d1\u5e03\u6e20\u9053"}</span>
                  <select className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" value={selectedChannel} onChange={(event) => setSelectedChannel(event.target.value)}>
                    {CHANNEL_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label className="space-y-2 text-sm text-slate-600">
                  <span>{"\u4f7f\u7528\u6a21\u578b"}</span>
                  <select className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" value={selectedModelId} onChange={(event) => setSelectedModelId(event.target.value)}>
                    <option value="">{"\u9ed8\u8ba4\u6a21\u578b"}</option>
                    {models.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
                <label className="space-y-2 text-sm text-slate-600">
                  <span>{"\u5185\u5bb9\u7c7b\u578b"}</span>
                  <select className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" value={selectedContentType} onChange={(event) => setSelectedContentType(event.target.value)}>
                    {CONTENT_TYPE_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                <label className="space-y-2 text-sm text-slate-600">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span>{"\u521b\u4f5c\u6307\u4ee4"}</span>
                    <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => setIsSuggestionOpen(true)}>
                      <BookOpen className="mr-2 h-4 w-4" />
                      {"\u4ece\u8bcd\u5e93\u4e0e\u9009\u9898\u5e93\u9009\u62e9"}
                    </Button>
                  </div>
                  <Textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={"\u4f8b\u5982\uff1a\u63a5\u8fd1\u5f00\u5173\u9009\u578b\u6307\u5357\uff1a\u5982\u4f55\u4e3a\u5de5\u4e1a\u5e94\u7528\u6311\u9009\u6700\u4f73\u611f\u5e94\u65b9\u6848"} className="min-h-[140px] resize-none rounded-2xl border-slate-200" />
                </label>
                <label className="space-y-2 text-sm text-slate-600">
                  <span>{"\u4e1a\u52a1\u573a\u666f"}</span>
                  <select className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" value={selectedTopicScene} onChange={(event) => setSelectedTopicScene(event.target.value)}>
                    <option value="">{"\u81ea\u52a8\u8bc6\u522b"}</option>
                    {scenes.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3 text-xs leading-6 text-slate-500">
                    <div>{"\u6765\u6e90\u7c7b\u578b\uff1a" + (SOURCE_TYPE_LABELS[sourceType] || sourceType)}</div>
                    <div className="truncate">{"\u6765\u6e90\u8bf4\u660e\uff1a" + (sourceLabel || "-")}</div>
                  </div>
                </label>
              </div>

              <div className="flex flex-wrap gap-3">

                <Button type="button" variant="outline" className="rounded-full" onClick={() => setIsBatchOpen(true)}>
                  {"\u6279\u91cf\u751f\u6210"}
                </Button>
                <Button type="button" className="rounded-full" onClick={() => void handleGenerate()} disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  {loading ? "\u751f\u6210\u4e2d" : "\u7acb\u5373\u751f\u6210"}
                </Button>
                <div className="flex items-center">{renderStatusBadge}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xl font-semibold">{"\u751f\u6210\u5185\u5bb9"}</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => void handleCopyRichText()} disabled={!result.trim()}>
                  <Copy className="mr-2 h-4 w-4" />
                  {"\u590d\u5236\u5bcc\u6587\u672c"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => void handleCopyPlainText()} disabled={!result.trim()}>
                  <Copy className="mr-2 h-4 w-4" />
                  {"\u590d\u5236\u5168\u6587"}
                </Button>
                <Button type="button" size="sm" onClick={() => void handleSave()} disabled={!taskId || isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {"\u4fdd\u5b58"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {lowQualityWarning ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="font-semibold">{"\u5f53\u524d GEO \u8bc4\u5206 " + lowQualityWarning.total + "\uff0c\u4f4e\u4e8e\u5efa\u8bae\u9608\u503c 55"}</div>
                      <div className="mt-1 text-xs leading-6 text-amber-800">
                        {"\u5efa\u8bae\u5148\u67e5\u770b\u6263\u5206\u539f\u56e0\u5e76\u4f18\u5316\u5185\u5bb9\uff0c\u4f60\u4ecd\u7136\u53ef\u4ee5\u9009\u62e9\u76f4\u63a5\u4fdd\u5b58\u3002"}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100" onClick={() => setShowScoreDetails((current) => !current)}>
                        {showScoreDetails ? "\u6536\u8d77\u4f18\u5316\u5efa\u8bae" : "\u67e5\u770b\u4f18\u5316\u5efa\u8bae"}
                      </Button>
                      <Button type="button" size="sm" className="bg-amber-600 text-white hover:bg-amber-700" onClick={() => void handleSave()} disabled={!taskId || isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {"\u4ecd\u7136\u4fdd\u5b58"}
                      </Button>
                    </div>
                  </div>
                  {showScoreDetails ? (
                    <div className="mt-3 space-y-2 border-t border-amber-200 pt-3">
                      {lowQualityWarning.dimensions.length > 0 ? (
                        lowQualityWarning.dimensions.map((item) => (
                          <div key={item.key} className="rounded-xl bg-white/80 px-3 py-2">
                            <div className="flex items-center justify-between gap-3 text-xs font-medium text-amber-900">
                              <span>{item.label}</span>
                              <span>{item.score + "/" + item.maxScore}</span>
                            </div>
                            <div className="mt-1 text-xs leading-6 text-amber-800">{item.reason}</div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-amber-800">{"\u6682\u65e0\u53ef\u5c55\u793a\u7684\u6263\u5206\u539f\u56e0\u3002"}</div>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <label className="space-y-2 text-sm text-slate-600">
                <span>{"\u6587\u7ae0\u6807\u9898"}</span>
                <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={"\u751f\u6210\u540e\u81ea\u52a8\u586b\u5145\u6807\u9898"} className="rounded-xl border-slate-200" />
              </label>
              <div data-color-mode="light" className="overflow-hidden rounded-2xl border border-slate-200">
                <MDEditor value={result} onChange={(value) => setResult(value || "")} height={520} preview="edit" />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{"\u54c1\u724c\u6807\u6ce8\u9884\u89c8"}</div>
                    <div className="text-xs text-slate-500">{"500ms \u9632\u6296\u540e\u81ea\u52a8\u66f4\u65b0\uff0chover \u53ef\u67e5\u770b\u63d0\u793a"}</div>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => void handleBrandAnnotations(result, taskId)} disabled={!taskId || !result.trim() || isAnnotating}>
                    {isAnnotating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                    {"\u91cd\u65b0\u6807\u6ce8"}
                  </Button>
                </div>
                <div className="mb-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded bg-white px-2 py-1 text-emerald-700 underline decoration-emerald-500 decoration-2 underline-offset-4">{"\u54c1\u724c\u5f15\u7528"}</span>
                  <span className="rounded bg-rose-100 px-2 py-1 text-rose-700">{"\u7981\u7528\u8868\u8ff0"}</span>
                  <span className="rounded bg-white px-2 py-1 text-sky-700 underline decoration-sky-500 decoration-2 underline-offset-4 decoration-dashed">{"\u6765\u6e90\u5efa\u8bae"}</span>
                  <span className="rounded bg-amber-100 px-2 py-1 text-amber-800">{"\u53e3\u5f84\u504f\u5dee"}</span>
                </div>
                <div className="max-h-[280px] overflow-y-auto rounded-2xl bg-white p-4 shadow-inner">
                  {previewParagraphs.length > 0 ? (
                    <div className="space-y-3 text-sm leading-7 text-slate-700">
                      {previewParagraphs.map((paragraph) => (
                        <div
                          key={"paragraph-" + paragraph.index}
                          ref={(node) => {
                            paragraphRefs.current[paragraph.index] = node;
                          }}
                          className={cn(
                            "scroll-mt-24 rounded-xl px-2 py-1 whitespace-pre-wrap transition-all duration-300",
                            activeParagraphIndex === paragraph.index ? "bg-amber-100 ring-2 ring-amber-300" : ""
                          )}
                        >
                          {paragraph.nodes}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap text-sm leading-7 text-slate-600">{result}</div>
                  )}
                </div>
              </div>
              {lastEditedAt ? <div className="text-xs text-slate-500">{"\u6700\u540e\u4fdd\u5b58\uff1a" + new Date(lastEditedAt).toLocaleString()}</div> : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <ShieldCheck className="h-4 w-4 text-sky-600" />
                {"AI\u5ba1\u6838\u6982\u89c8"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              {aiReview ? (
                <>
                  <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold", REVIEW_STATUS_STYLES[aiReview.status || "revise"] || "bg-slate-100 text-slate-700")}>{REVIEW_STATUS_LABELS[aiReview.status || "revise"] || aiReview.status || "-"}</span>
                  <p>{aiReview.summary || "\u6682\u65e0\u5ba1\u6838\u7ed3\u8bba"}</p>
                  {normalizedReviewIssues.length > 0 ? (
                    <ul className="space-y-2">
                      {normalizedReviewIssues.map((item, index) => (
                        <li key={item.text + "-" + index} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 px-3 py-2">
                          <span className="text-sm leading-6 text-slate-700">{item.text}</span>
                          {Number.isInteger(item.paragraphIndex) ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 rounded-full text-slate-500 hover:bg-amber-50 hover:text-amber-700"
                              onClick={() => handleLocateIssue(item.paragraphIndex)}
                              title={"\u5b9a\u4f4d\u5230\u7b2c " + (Number(item.paragraphIndex) + 1) + " \u6bb5"}
                            >
                              <Crosshair className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              ) : (
                <p>{"\u751f\u6210\u5185\u5bb9\u540e\u81ea\u52a8\u8f93\u51fa AI \u5ba1\u6838\u7ed3\u679c"}</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                {"\u53d1\u5e03\u524d\u68c0\u67e5"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              {publishCheck ? (
                <>
                  {Array.isArray(publishCheck.items) && publishCheck.items.length > 0 ? publishCheck.items.map((item) => (
                    <div key={item.key} className="rounded-2xl border border-slate-200 p-3">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="font-medium text-slate-900">{item.label}</div>
                        <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", CHECK_LEVEL_STYLES[item.level] || "bg-slate-100 text-slate-700")}>{CHECK_LEVEL_LABELS[item.level] || item.level}</span>
                      </div>
                      <p className="text-xs leading-6 text-slate-500">{item.detail}</p>
                    </div>
                  )) : <p>{"\u672a\u8fd4\u56de\u68c0\u67e5\u9879"}</p>}
                  {publishCheck.recommendedAction ? <div className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-500">{"\u5efa\u8bae\u64cd\u4f5c\uff1a" + publishCheck.recommendedAction}</div> : null}
                </>
              ) : (
                <p>{"\u6682\u65e0\u68c0\u67e5\u7ed3\u679c"}</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <BookOpen className="h-4 w-4 text-emerald-600" />
                {"\u54c1\u724c\u63d0\u53ca\u68c0\u67e5"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl bg-slate-50 p-3"><div className="text-slate-400">{"\u54c1\u724c\u540d\u51fa\u73b0\u6b21\u6570"}</div><div className={cn("mt-1 text-lg font-semibold", metricTone(brandMetrics?.brandMentionCount || 0))}>{brandMetrics?.brandMentionCount ?? "-"}</div></div>
                <div className="rounded-2xl bg-slate-50 p-3"><div className="text-slate-400">{"\u6838\u5fc3\u573a\u666f\u8986\u76d6"}</div><div className={cn("mt-1 text-lg font-semibold", (brandMetrics?.sceneCovered || 0) < (brandMetrics?.sceneTotal || 0) ? "text-amber-700" : "text-slate-900")}>{brandMetrics ? brandMetrics.sceneCovered + "/" + brandMetrics.sceneTotal : "-"}</div></div>
                <div className="rounded-2xl bg-slate-50 p-3"><div className="text-slate-400">{"\u7981\u7528\u8bcd\u6570\u91cf"}</div><div className={cn("mt-1 text-lg font-semibold", metricTone(brandMetrics?.forbiddenCount || 0, "danger"))}>{brandMetrics?.forbiddenCount ?? "-"}</div></div>
                <div className="rounded-2xl bg-slate-50 p-3"><div className="text-slate-400">{"\u5f15\u7528\u6765\u6e90\u6570\u91cf"}</div><div className={cn("mt-1 text-lg font-semibold", metricTone(brandMetrics?.sourceCount || 0))}>{brandMetrics?.sourceCount ?? "-"}</div></div>
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" size="sm" onClick={() => void handleBrandCheck(result)} disabled={!result.trim() || isBrandChecking}>
                  {isBrandChecking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  {"\u91cd\u65b0\u68c0\u67e5"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => void handleBrandAnnotations(result, taskId)} disabled={!taskId || !result.trim() || isAnnotating}>
                  {isAnnotating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                  {"\u66f4\u65b0\u91cf\u5316\u5361"}
                </Button>
              </div>
              {brandCheck ? (
                <>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-2xl bg-slate-50 p-3"><div className="text-slate-400">{"\u547d\u4e2d\u5f15\u7528"}</div><div className="mt-1 text-lg font-semibold text-slate-900">{brandCheck.referenceCount}</div></div>
                    <div className="rounded-2xl bg-slate-50 p-3"><div className="text-slate-400">{"\u98ce\u9669\u8868\u8ff0"}</div><div className="mt-1 text-lg font-semibold text-slate-900">{brandCheck.riskCount}</div></div>
                  </div>
                  {brandCheck.references.length > 0 ? <ul className="space-y-2 text-xs">{brandCheck.references.map((item, index) => <li key={item.label + "-" + index} className="rounded-2xl border border-slate-200 p-3"><div className="font-medium text-slate-900">{item.label}</div><div className="mt-1 text-slate-500">{item.excerpt}</div></li>)}</ul> : <p>{"\u6682\u65e0\u54c1\u724c\u5f15\u7528"}</p>}
                  {brandCheck.risks.length > 0 ? <ul className="space-y-2 text-xs">{brandCheck.risks.map((item, index) => <li key={item.term + "-" + index} className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-rose-700">{item.term + "?" + item.reason}</li>)}</ul> : null}
                </>
              ) : (
                <p>{"\u6682\u65e0\u54c1\u724c\u68c0\u67e5\u7ed3\u679c"}</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <BarChart3 className="h-4 w-4 text-violet-600" />
                {"GEO \u8d28\u91cf\u8bc4\u5206"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <Button type="button" variant="outline" size="sm" onClick={() => void handleScore(result)} disabled={!result.trim() || isScoring}>
                {isScoring ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChart3 className="mr-2 h-4 w-4" />}
                {"\u91cd\u65b0\u8bc4\u5206"}
              </Button>
              {score ? (
                <>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <div className="text-xs text-slate-400">{"\u603b\u5206"}</div>
                        <div className="mt-1 text-3xl font-semibold text-slate-900">{score.total}</div>
                      </div>
                      <div className={cn("rounded-full px-3 py-1 text-xs font-medium", score.total >= 85 ? "bg-emerald-50 text-emerald-700" : score.total >= 55 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700")}>
                        {score.total >= 85 ? "\u4f18\u79c0" : score.total >= 55 ? "\u53ef\u4f18\u5316" : "\u98ce\u9669"}
                      </div>
                    </div>
                    <div className="mt-2 text-xs leading-6 text-slate-500">{score.suggestion}</div>
                  </div>
                  <div className="space-y-2">
                    {score.dimensions.map((item) => (
                      <div key={item.key} className="rounded-2xl border border-slate-200 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                              <span>{item.label}</span>
                              <button
                                type="button"
                                title={item.description}
                                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 text-[11px] font-semibold text-slate-500 hover:bg-slate-50"
                              >
                                {"?"}
                              </button>
                            </div>
                            <div className="mt-1 text-xs leading-6 text-slate-500">{item.reason}</div>
                          </div>
                          <div className="shrink-0 text-sm font-semibold text-slate-900">{item.score + "/" + item.maxScore}</div>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                item.score >= item.maxScore * 0.8 ? "bg-emerald-500" : item.score >= item.maxScore * 0.55 ? "bg-amber-500" : "bg-rose-500",
                              )}
                              style={{ width: Math.min(100, Math.max(0, (item.score / item.maxScore) * 100)) + "%" }}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs text-slate-500 hover:text-slate-900"
                            onClick={() => setExpandedScoreDimension((current) => (current === item.key ? null : item.key))}
                          >
                            {expandedScoreDimension === item.key ? "\u6536\u8d77\u5efa\u8bae" : "\u5c55\u5f00\u5efa\u8bae"}
                          </Button>
                        </div>
                        {expandedScoreDimension === item.key ? (
                          <div className="mt-3 rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-600">
                            {item.tips.length > 0 ? (
                              <ul className="space-y-1.5">
                                {item.tips.map((tip, index) => (
                                  <li key={item.key + "-" + index} className="leading-6">{"\u2022 " + tip}</li>
                                ))}
                              </ul>
                            ) : (
                              <div className="leading-6">{item.reason}</div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </>
              ) : <p>{"\u6682\u65e0\u8bc4\u5206\u7ed3\u679c"}</p>}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">{"\u53ef\u53c2\u8003\u6837\u677f"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              {samplesLoading ? <p>{"\u52a0\u8f7d\u4e2d..."}</p> : sampleReferences.length > 0 ? sampleReferences.map((item) => <button type="button" key={item.id} className="w-full rounded-2xl border border-slate-200 p-3 text-left transition hover:border-sky-200 hover:bg-sky-50" onClick={() => applyTopicSuggestion({ title: item.title, scene: item.scene, channel: item.channel, sourceType: "sample", sourceLabel: item.title })}><div className="font-medium text-slate-900">{item.title}</div><div className="mt-1 text-xs text-slate-500">{item.excerpt}</div></button>) : <p>{"\u5f53\u524d\u6e20\u9053\u548c\u573a\u666f\u6682\u65e0\u6837\u677f"}</p>}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">{"\u7248\u672c\u8bb0\u5f55"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              {versions.length > 0 ? versions.map((version) => <div key={version.id} className="rounded-2xl border border-slate-200 p-3"><div className="flex items-center justify-between gap-3"><div><div className="font-medium text-slate-900">{"v" + version.versionNumber + " / " + version.source}</div><div className="text-xs text-slate-400">{new Date(version.createdAt).toLocaleString()}</div></div><Button type="button" variant="outline" size="sm" onClick={() => void handleRestoreVersion(version.id)} disabled={restoringVersionId === version.id}>{restoringVersionId === version.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "\u6062\u590d"}</Button></div><div className="mt-2 text-xs text-slate-500">{version.title || "-"}</div></div>) : <p>{"\u6682\u65e0\u7248\u672c\u8bb0\u5f55"}</p>}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isSuggestionOpen} onOpenChange={setIsSuggestionOpen}>
        <DialogContent className="max-w-5xl rounded-3xl border-0 p-0 shadow-2xl">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle>{"\u4ece\u8bcd\u5e93\u4e0e\u9009\u9898\u5e93\u9009\u62e9"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 px-6 py-6 xl:grid-cols-3">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-900">{"\u0041\u0049 \u63a8\u8350\u9009\u9898"}</h3>
                {suggestionsLoading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
              </div>
              <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                {topicSuggestions.map((item) => <button type="button" key={item.id} className="w-full rounded-2xl border border-slate-200 p-4 text-left transition hover:border-sky-200 hover:bg-sky-50" onClick={() => applyTopicSuggestion({ title: item.title, keyword: item.keyword, scene: item.scene, channel: item.channel, sourceType: "keyword", sourceLabel: item.title || item.keyword })}><div className="font-medium text-slate-900">{item.title}</div><div className="mt-1 text-xs text-slate-500">{item.keyword + (item.scene ? " / " + item.scene : "") + (item.channel ? " / " + item.channel : "")}</div>{item.reason ? <div className="mt-2 text-xs text-slate-500">{item.reason}</div> : null}</button>)}
                {!suggestionsLoading && topicSuggestions.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">{"\u6682\u65e0\u63a8\u8350\u9009\u9898"}</div> : null}
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-900">{"\u9009\u9898\u5e93"}</h3>
                {topicsLoading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
              </div>
              <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                {filteredTopics.map((item) => <button type="button" key={item.id} className="w-full rounded-2xl border border-slate-200 p-4 text-left transition hover:border-sky-200 hover:bg-sky-50" onClick={() => applyTopicSuggestion({ title: item.topic, scene: item.scene, channel: item.channel, sourceType: "topic", sourceLabel: item.topic })}><div className="font-medium text-slate-900">{item.topic}</div><div className="mt-1 text-xs text-slate-500">{(item.scene || "\u901a\u7528") + " / " + (item.channel || selectedChannel)}</div></button>)}
                {!topicsLoading && filteredTopics.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">{"\u6682\u65e0\u53ef\u7528\u9009\u9898"}</div> : null}
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-900">{"\u5173\u952e\u8bcd\u8bcd\u5e93"}</h3>
                {keywordsLoading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
              </div>
              <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                {keywords.map((item) => <button type="button" key={item.id} className="w-full rounded-2xl border border-slate-200 p-4 text-left transition hover:border-sky-200 hover:bg-sky-50" onClick={() => applyTopicSuggestion({ keyword: item.keyword, scene: item.scene, channel: selectedChannel, sourceType: "keyword", sourceLabel: item.keyword })}><div className="font-medium text-slate-900">{item.keyword}</div><div className="mt-1 text-xs text-slate-500">{(item.scene || "\u901a\u7528") + (item.groupName ? " / " + item.groupName : "")}</div></button>)}
                {!keywordsLoading && keywords.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">{"\u6682\u65e0\u53ef\u7528\u5173\u952e\u8bcd"}</div> : null}
              </div>
            </div>
          </div>
          <DialogFooter className="border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={() => setIsSuggestionOpen(false)}>{"\u5173\u95ed"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBatchOpen} onOpenChange={setIsBatchOpen}>
        <DialogContent className="max-w-5xl rounded-3xl border-0 p-0 shadow-2xl">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle>{"\u6279\u91cf\u751f\u6210"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 px-6 py-6">
            <div className="grid gap-4 md:grid-cols-[220px_220px_1fr]">
              <label className="space-y-2 text-sm text-slate-600">
                <span>{"\u573a\u666f\u8fc7\u6ee4"}</span>
                <select className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" value={filterScene} onChange={(event) => setFilterScene(event.target.value)}>
                  <option value={ALL_SCENES}>{ALL_SCENES}</option>
                  {scenes.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="space-y-2 text-sm text-slate-600">
                <span>{"\u7edf\u4e00\u6e20\u9053"}</span>
                <select className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" value={batchUnifiedChannel} onChange={(event) => setBatchUnifiedChannel(event.target.value)}>
                  {CHANNEL_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-2 pt-8 text-sm text-slate-600">
                <input type="checkbox" checked={batchUnified} onChange={(event) => setBatchUnified(event.target.checked)} />
                <span>{"\u4f7f\u7528\u7edf\u4e00\u6e20\u9053\u548c\u7c7b\u578b"}</span>
              </label>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex flex-col gap-1">
                <div className="text-sm font-medium text-slate-900">{"\u5dee\u5f02\u5316\u7ef4\u5ea6"}</div>
                <div className="text-xs leading-6 text-slate-500">
                  {"\u53ef\u9009\u3002\u4e0d\u52fe\u9009\u65f6\u4fdd\u6301\u539f\u6279\u91cf\u751f\u6210\u903b\u8f91\uff0c\u52fe\u9009\u540e\u540e\u7eed\u4f1a\u4e3a\u6bcf\u7bc7\u5185\u5bb9\u6ce8\u5165\u4e0d\u540c\u7684\u5dee\u5f02\u5316\u6307\u4ee4\u3002"}
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {BATCH_VARIATION_OPTIONS.map((item) => {
                  const checked = batchVariationDimensions.includes(item.key);
                  return (
                    <label key={item.key} className={cn("flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition", checked ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white")}>
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={checked}
                        onChange={(event) =>
                          setBatchVariationDimensions((current) =>
                            event.target.checked ? [...current, item.key] : current.filter((value) => value !== item.key),
                          )
                        }
                      />
                      <div>
                        <div className="text-sm font-medium text-slate-900">{item.label}</div>
                        <div className="mt-1 text-xs leading-5 text-slate-500">{item.hint}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="grid max-h-[420px] gap-3 overflow-y-auto pr-1">
              {topicsLoading ? <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />{"\u9009\u9898\u52a0\u8f7d\u4e2d..."}</div> : filteredTopics.map((item) => <label key={item.id} className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4"><input type="checkbox" className="mt-1" checked={batchSelectedIds.includes(item.id)} onChange={(event) => setBatchSelectedIds((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} /><div><div className="font-medium text-slate-900">{item.topic}</div><div className="mt-1 text-xs text-slate-500">{item.scene + " / " + item.channel}</div></div></label>)}
            </div>
          </div>
          <DialogFooter className="border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={() => setIsBatchOpen(false)}>{"\u53d6\u6d88"}</Button>
            <Button type="button" onClick={() => void handleBatchGenerate()} disabled={isBatchSubmitting}>
              {isBatchSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {"\u63d0\u4ea4\u6279\u91cf\u751f\u6210"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}







