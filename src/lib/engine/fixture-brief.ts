import type { Brief } from "@/lib/brief/schema";

export const smokeBrief: Brief = {
  id: "finance-bill-2024-smoke",
  title: "The Finance Bill, 2024",
  source: {
    url: "http://kenyalaw.org/kl/fileadmin/pdfdownloads/Bills/2024/TheFinanceBill_2024.pdf",
    publisher: "National Assembly of Kenya",
    publishedAt: "2024-05-09",
    retrievedAt: "2026-09-21",
  },
  jurisdiction: "national",
  summary:
    "National tax measures including a fuel levy increase, VAT on staple bread, and a payroll housing levy.",
  provisions: [
    {
      id: "p1",
      title: "Fuel levy",
      summary:
        "Increases the fuel levy, raising pump prices for motorists, boda operators, and fishers using outboard engines.",
      whoPays: [
        "motorists",
        "fishers using outboard engines",
        "boda and matatu operators",
      ],
      whoBenefits: ["road maintenance fund"],
      effectiveDate: "2024-07-01",
      enforcement: "Kenya Revenue Authority",
      tags: ["fuel"],
      sourceExcerpt:
        "Fixture excerpt pending Brief extraction: fuel levy increase.",
    },
    {
      id: "p2",
      title: "VAT on bread",
      summary: "Applies VAT to previously zero-rated staple bread.",
      whoPays: ["households buying staple bread"],
      whoBenefits: [],
      effectiveDate: "2024-07-01",
      enforcement: "Kenya Revenue Authority",
      tags: ["vat_staple"],
      sourceExcerpt:
        "Fixture excerpt pending Brief extraction: VAT on bread.",
    },
    {
      id: "p3",
      title: "Housing levy",
      summary: "A payroll housing levy on formal wages.",
      whoPays: ["formal employees"],
      whoBenefits: ["affordable housing programme"],
      effectiveDate: "2024-07-01",
      enforcement: "Kenya Revenue Authority",
      tags: ["payroll_levy"],
      sourceExcerpt:
        "Fixture excerpt pending Brief extraction: housing levy.",
    },
  ],
};
