import { Command } from "commander";
import { google } from "googleapis";
import { getAuthClient } from "../../lib/auth.js";
import { formatOutput, type OutputFormat } from "../../lib/format.js";

export function registerMcAccounts(mc: Command): void {
  mc.command("accounts")
    .description("List accessible Merchant Center accounts")
    .option("-f, --format <fmt>", "Output format: json, table, csv", "table")
    .action(async (opts) => {
      try {
        const auth = getAuthClient();
        const api = google.merchantapi({ version: "accounts_v1", auth });

        const rows: Record<string, unknown>[] = [];
        let pageToken: string | undefined;
        do {
          const res = await api.accounts.list({ pageSize: 100, pageToken });
          for (const a of res.data.accounts || []) {
            rows.push({
              account: a.name || "",
              accountId: a.accountId || "",
              displayName: a.accountName || "",
              timeZone: a.timeZone?.id || "",
              language: a.languageCode || "",
            });
          }
          pageToken = res.data.nextPageToken || undefined;
        } while (pageToken);

        console.log(
          formatOutput(rows, opts.format as OutputFormat, [
            "accountId",
            "displayName",
            "timeZone",
            "language",
          ])
        );
        console.error(`\n# ${rows.length} accounts`);
      } catch (err) {
        console.error("Error:", (err as Error).message);
        process.exit(1);
      }
    });
}
