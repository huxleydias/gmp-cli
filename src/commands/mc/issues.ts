import { Command } from "commander";
import { google } from "googleapis";
import { getAuthClient } from "../../lib/auth.js";
import { formatOutput, type OutputFormat } from "../../lib/format.js";

export function registerMcIssues(mc: Command): void {
  mc.command("issues")
    .description("List account-level issues")
    .requiredOption("-a, --account <id>", "Merchant Center account ID")
    .option("-f, --format <fmt>", "Output format: json, table, csv", "table")
    .action(async (opts) => {
      try {
        const auth = getAuthClient();
        const api = google.merchantapi({ version: "accounts_v1", auth });

        const rows: Record<string, unknown>[] = [];
        let pageToken: string | undefined;
        do {
          const res = await api.accounts.issues.list({
            parent: `accounts/${opts.account}`,
            pageSize: 100,
            pageToken,
          });
          for (const i of res.data.accountIssues || []) {
            rows.push({
              title: i.title || "",
              severity: i.severity || "",
              impactedDestinations: (i.impactedDestinations || [])
                .map((d) => d.reportingContext)
                .join("|"),
              detail: i.detail || "",
              documentation: i.documentationUri || "",
            });
          }
          pageToken = res.data.nextPageToken || undefined;
        } while (pageToken);

        console.log(
          formatOutput(rows, opts.format as OutputFormat, [
            "title",
            "severity",
            "impactedDestinations",
            "detail",
          ])
        );
        console.error(`\n# ${rows.length} account issues`);
      } catch (err) {
        console.error("Error:", (err as Error).message);
        process.exit(1);
      }
    });
}
