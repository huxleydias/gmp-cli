import { merchantapi_products_v1 } from "googleapis";

export type Product = merchantapi_products_v1.Schema$Product;

function formatPrice(price?: {
  amountMicros?: string | null;
  currencyCode?: string | null;
}): string {
  if (!price?.amountMicros) return "";
  const amount = Number(price.amountMicros) / 1_000_000;
  return `${amount.toFixed(2)} ${price.currencyCode || ""}`.trim();
}

export function flattenProduct(p: Product): Record<string, unknown> {
  const attrs = p.productAttributes || {};
  const issues = p.productStatus?.itemLevelIssues || [];
  const disapproved = (p.productStatus?.destinationStatuses || []).some(
    (d) => (d.disapprovedCountries || []).length > 0
  );
  return {
    offerId: p.offerId || "",
    title: attrs.title || "",
    link: attrs.link || "",
    availability: attrs.availability || "",
    price: formatPrice(attrs.price ?? undefined),
    brand: attrs.brand || "",
    gtin: (attrs.gtins || []).join("|"),
    mpn: attrs.mpn || "",
    condition: attrs.condition || "",
    imageLink: attrs.imageLink || "",
    itemGroupId: attrs.itemGroupId || "",
    googleProductCategory: attrs.googleProductCategory || "",
    identifierExists: attrs.identifierExists ?? "",
    disapproved: String(disapproved),
    issueCount: issues.length,
    issueCodes: issues.map((i) => i.code).join("|"),
    maxSeverity: issues.some((i) => i.severity === "DISAPPROVED")
      ? "DISAPPROVED"
      : issues.some((i) => i.severity === "DEMOTED")
        ? "DEMOTED"
        : issues.length > 0
          ? "NOT_IMPACTED"
          : "",
  };
}

export const PRODUCT_SUMMARY_HEADERS = [
  "offerId",
  "title",
  "link",
  "availability",
  "price",
  "brand",
  "gtin",
  "identifierExists",
  "disapproved",
  "issueCount",
  "issueCodes",
  "maxSeverity",
];
