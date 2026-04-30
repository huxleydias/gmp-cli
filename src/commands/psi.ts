import { Command } from "commander";
import { formatOutput, type OutputFormat } from "../lib/format.js";
import {
  VALID_CATEGORIES,
  METRIC_KEYS,
  CRUX_METRICS,
  scoreLabel,
  buildPsiUrl,
  type PsiResponse,
} from "../lib/psi.js";

export function registerPsiCommand(program: Command): void {
  const psi = program
    .command("psi")
    .description("PageSpeed Insights — Lighthouse scores and Core Web Vitals");

  psi.command("analyze")
    .description("Run PageSpeed Insights analysis for a URL")
    .argument("<url>", "URL to analyze")
    .option("--strategy <s>", "Analysis strategy: mobile, desktop", "mobile")
    .option(
      "--category <list>",
      `Comma-separated categories: ${VALID_CATEGORIES.join(", ")}`,
      "performance"
    )
    .option("--locale <l>", "Locale for formatted results (e.g. pt-BR, en)", "en")
    .option("--key <k>", "Google API key (or set GOOGLE_API_KEY env var)")
    .option("-f, --format <fmt>", "Output format: json, table, csv", "table")
    .action(async (url: string, opts) => {
      const apiKey = (opts.key as string | undefined) ?? process.env.GOOGLE_API_KEY;
      const categories = (opts.category as string)
        .split(",")
        .map((c: string) => c.trim().toLowerCase())
        .filter((c: string) => VALID_CATEGORIES.includes(c));

      if (categories.length === 0) {
        console.error(`Invalid category. Valid values: ${VALID_CATEGORIES.join(", ")}`);
        process.exit(1);
      }

      const strategy = (opts.strategy as string).toLowerCase();
      if (!["mobile", "desktop"].includes(strategy)) {
        console.error("Strategy must be mobile or desktop");
        process.exit(1);
      }

      try {
        const apiUrl = buildPsiUrl(url, { strategy, categories, locale: opts.locale as string, key: apiKey });
        const res = await fetch(apiUrl);
        const data = (await res.json()) as PsiResponse;

        if (data.error) {
          console.error("API error:", data.error.message);
          process.exit(1);
        }

        if (opts.format === "json") {
          console.log(JSON.stringify(data, null, 2));
          return;
        }

        const lhr = data.lighthouseResult;

        const scoreRows = Object.entries(lhr?.categories ?? {}).map(([, cat]) => ({
          category: cat.title ?? "",
          score: scoreLabel(cat.score),
        }));

        if (scoreRows.length > 0) {
          console.log("\n## Scores");
          console.log(formatOutput(scoreRows, opts.format as OutputFormat, ["category", "score"]));
        }

        const metricRows = METRIC_KEYS
          .map((key) => {
            const audit = lhr?.audits?.[key];
            if (!audit) return null;
            return { metric: key, value: audit.displayValue ?? "n/a", score: scoreLabel(audit.score) };
          })
          .filter(Boolean) as { metric: string; value: string; score: string }[];

        if (metricRows.length > 0) {
          console.log("\n## Lighthouse Metrics");
          console.log(formatOutput(metricRows, opts.format as OutputFormat, ["metric", "value", "score"]));
        }

        const crux = data.loadingExperience;
        if (crux?.metrics) {
          const cruxRows = Object.entries(crux.metrics)
            .filter(([key]) => CRUX_METRICS[key])
            .map(([key, metric]) => ({
              metric: CRUX_METRICS[key]!,
              p75: String(metric.percentile ?? "n/a"),
              category: metric.category ?? "n/a",
            }));

          if (cruxRows.length > 0) {
            console.log(`\n## Field Data (CrUX) — overall: ${crux.overall_category ?? "n/a"}`);
            console.log(formatOutput(cruxRows, opts.format as OutputFormat, ["metric", "p75", "category"]));
          }
        }

        console.error(`\n# strategy: ${strategy} | url: ${url}`);
      } catch (err) {
        console.error("Error:", (err as Error).message);
        process.exit(1);
      }
    });
}
