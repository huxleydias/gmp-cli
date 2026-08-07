import { Command } from "commander";
import { registerMcAccounts } from "./mc/accounts.js";
import { registerMcProducts } from "./mc/products.js";
import { registerMcIssues } from "./mc/issues.js";

export function registerMcCommand(program: Command): void {
  const mc = program
    .command("mc")
    .description("Google Merchant Center (Merchant API)");

  registerMcAccounts(mc);
  registerMcProducts(mc);
  registerMcIssues(mc);
}
