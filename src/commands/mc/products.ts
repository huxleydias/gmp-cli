import { Command } from "commander";
import { google } from "googleapis";
import * as fs from "fs";
import { getAuthClient } from "../../lib/auth.js";
import { formatOutput, type OutputFormat } from "../../lib/format.js";
import {
  flattenProduct,
  PRODUCT_SUMMARY_HEADERS,
  type Product,
} from "../../lib/mc-format.js";

export function registerMcProducts(mc: Command): void {
  mc.command("products")
    .description(
      "List products with status and item-level issues (paginates through the full catalog)"
    )
    .requiredOption("-a, --account <id>", "Merchant Center account ID")
    .option("-l, --limit <n>", "Max products to fetch (default: all)")
    .option(
      "-o, --out <file>",
      "Save full raw JSON (products + statuses) to file; prints summary rows to stdout"
    )
    .option("-f, --format <fmt>", "Output format: json, table, csv", "csv")
    .action(async (opts) => {
      try {
        const auth = getAuthClient();
        const api = google.merchantapi({ version: "products_v1", auth });

        const limit = opts.limit ? parseInt(opts.limit as string) : Infinity;
        const products: Product[] = [];
        let pageToken: string | undefined;
        do {
          const res = await api.accounts.products.list({
            parent: `accounts/${opts.account}`,
            pageSize: 250,
            pageToken,
          });
          products.push(...(res.data.products || []));
          pageToken = res.data.nextPageToken || undefined;
          if (products.length >= limit) break;
          if (products.length > 0 && products.length % 1000 < 250) {
            console.error(`# fetched ${products.length} products...`);
          }
        } while (pageToken);

        const sliced = products.slice(0, limit);
        if (opts.out) {
          fs.writeFileSync(
            opts.out as string,
            JSON.stringify(sliced, null, 2)
          );
          console.error(`# raw JSON saved to ${opts.out}`);
        }

        const rows = sliced.map(flattenProduct);
        console.log(
          formatOutput(rows, opts.format as OutputFormat, PRODUCT_SUMMARY_HEADERS)
        );
        console.error(`\n# ${rows.length} products`);
      } catch (err) {
        console.error("Error:", (err as Error).message);
        process.exit(1);
      }
    });
}
