export type CatalogItem = {
  id: string;
  name: string;
  detail: string;
  priceCents: number;
  displayPrice?: string;
  imagePath?: string;
  tone: "coral" | "blue" | "pink" | "yellow" | "ice" | "orange";
};

/**
 * The public menu and the order API both import this catalog. Prices submitted
 * by a browser are never trusted; the API calculates totals from these values.
 */
export const catalog: readonly CatalogItem[] = [
  {
    id: "white-claw-12",
    name: "White Claw",
    detail: "12 pack",
    priceCents: 2100,
    imagePath: "/drinks/white-claw.png",
    tone: "ice",
  },
  {
    id: "white-claw-6",
    name: "White Claw",
    detail: "6 pack",
    priceCents: 1000,
    imagePath: "/drinks/white-claw.png",
    tone: "ice",
  },
  {
    id: "smirnoff-6",
    name: "Smirnoff",
    detail: "6 pack",
    priceCents: 1200,
    imagePath: "/drinks/smirnoff.png",
    tone: "blue",
  },
  {
    id: "beatbox",
    name: "BeatBox",
    detail: "Single",
    priceCents: 500,
    imagePath: "/drinks/beatbox.png",
    tone: "pink",
  },
  {
    id: "ultra-24",
    name: "Ultra",
    detail: "24 pack",
    priceCents: 3000,
    imagePath: "/drinks/ultra.jpeg",
    tone: "blue",
  },
  {
    id: "malibu-handle",
    name: "Malibu",
    detail: "Handle",
    priceCents: 3500,
    imagePath: "/drinks/malibu.png",
    tone: "orange",
  },
  {
    id: "malibu-750",
    name: "Malibu",
    detail: "750 mL",
    priceCents: 2500,
    imagePath: "/drinks/malibu.png",
    tone: "orange",
  },
  {
    id: "nikolai-handle",
    name: "Nikolai",
    detail: "Handle",
    priceCents: 1700,
    imagePath: "/drinks/nikolai.jpg",
    tone: "ice",
  },
  {
    id: "titos-handle",
    name: "Tito’s",
    detail: "Handle",
    priceCents: 4500,
    imagePath: "/drinks/titos.jpg",
    tone: "yellow",
  },
  {
    id: "buzzball",
    name: "BuzzBall",
    detail: "Price varies · total uses $27",
    priceCents: 2700,
    displayPrice: "$25–$27",
    imagePath: "/drinks/buzzball.png",
    tone: "coral",
  },
  {
    id: "high-noon-8",
    name: "High Noon",
    detail: "8 pack",
    priceCents: 3500,
    imagePath: "/drinks/high-noon.png",
    tone: "yellow",
  },
  {
    id: "surfside-8",
    name: "Surfside",
    detail: "8 pack",
    priceCents: 2500,
    imagePath: "/drinks/surfside.png",
    tone: "blue",
  },
  {
    id: "surfside-12",
    name: "Surfside",
    detail: "12 pack",
    priceCents: 3500,
    imagePath: "/drinks/surfside.png",
    tone: "blue",
  },
];

export const paymentMethods = [
  "Venmo",
  "Cash App",
  "Zelle",
  "Apple Cash",
  "Cash",
  "Other",
] as const;

export type PaymentMethod = (typeof paymentMethods)[number];

export function findCatalogItem(id: string): CatalogItem | undefined {
  return catalog.find((item) => item.id === id);
}
