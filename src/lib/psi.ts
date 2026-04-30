export const PSI_API = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export const VALID_CATEGORIES = ["performance", "accessibility", "best-practices", "seo", "pwa"];

export const METRIC_KEYS = [
  "first-contentful-paint",
  "largest-contentful-paint",
  "total-blocking-time",
  "cumulative-layout-shift",
  "speed-index",
  "interactive",
  "interaction-to-next-paint",
];

export const CRUX_METRICS: Record<string, string> = {
  FIRST_CONTENTFUL_PAINT_MS: "FCP",
  LARGEST_CONTENTFUL_PAINT_MS: "LCP",
  FIRST_INPUT_DELAY_MS: "FID",
  CUMULATIVE_LAYOUT_SHIFT_SCORE: "CLS",
  INTERACTION_TO_NEXT_PAINT: "INP",
  EXPERIMENTAL_TIME_TO_FIRST_BYTE: "TTFB",
};

export interface LighthouseAudit {
  displayValue?: string;
  score?: number | null;
  numericValue?: number;
}

export interface LighthouseCategoryResult {
  score?: number | null;
  title?: string;
}

export interface LighthouseResult {
  categories?: Record<string, LighthouseCategoryResult>;
  audits?: Record<string, LighthouseAudit>;
}

export interface CruxMetric {
  percentile?: number;
  category?: string;
}

export interface LoadingExperience {
  overall_category?: string;
  metrics?: Record<string, CruxMetric>;
}

export interface PsiResponse {
  lighthouseResult?: LighthouseResult;
  loadingExperience?: LoadingExperience;
  originLoadingExperience?: LoadingExperience;
  error?: { message?: string };
}

export function scoreLabel(score: number | null | undefined): string {
  if (score == null) return "n/a";
  const pct = Math.round(score * 100);
  if (pct >= 90) return `${pct} (good)`;
  if (pct >= 50) return `${pct} (needs improvement)`;
  return `${pct} (poor)`;
}

export function buildPsiUrl(url: string, opts: {
  strategy: string;
  categories: string[];
  locale: string;
  key?: string;
}): string {
  const params = new URLSearchParams({ url, strategy: opts.strategy.toUpperCase(), locale: opts.locale });
  for (const cat of opts.categories) {
    params.append("category", cat.toUpperCase().replace("-", "_"));
  }
  if (opts.key) params.set("key", opts.key);
  return `${PSI_API}?${params}`;
}
