const CATEGORY_RULES: ReadonlyArray<{ category: string; keywords: readonly string[] }> = [
  { category: "Streaming", keywords: ["netflix", "hulu", "disney", "paramount", "spotify", "youtube", "apple tv", "prime video"] },
  { category: "Productivity", keywords: ["notion", "slack", "figma", "github", "canva", "office", "microsoft 365", "workspace"] },
  { category: "Cloud & Hosting", keywords: ["aws", "azure", "gcp", "cloudflare", "vercel", "netlify", "digitalocean", "render"] },
  { category: "Gaming", keywords: ["xbox", "playstation", "steam", "nintendo", "epic"] },
  { category: "Utilities", keywords: ["vpn", "internet", "mobile", "phone", "electricity", "water", "gas"] },
];

export function inferSubscriptionCategory(name: string): string {
  const lowered = name.trim().toLowerCase();

  if (!lowered) {
    return "Other";
  }

  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => lowered.includes(keyword))) {
      return rule.category;
    }
  }

  return "Other";
}
