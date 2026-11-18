export type Template = {
  id: string;
  title: string;
  category: string;
  price: number;
  theme: string;
  accent: string;
  flower: string;
  description: string;
};
export const templates: Template[] = [
  {
    id: "royal-bengali",
    title: "Royal Bengali",
    category: "Traditional",
    price: 999,
    theme: "linear-gradient(145deg,#611e34,#a93e56)",
    accent: "#e9bb7c",
    flower: "✿",
    description: "A timeless celebration of Bengali traditions",
  },
  {
    id: "ivory-dreams",
    title: "Ivory Dreams",
    category: "Minimal",
    price: 699,
    theme: "linear-gradient(145deg,#eee3d3,#f9f5ee)",
    accent: "#886d52",
    flower: "❀",
    description: "Soft, minimal and effortlessly elegant",
  },
  {
    id: "palace-affair",
    title: "Palace Affair",
    category: "Royal",
    price: 1499,
    theme: "linear-gradient(145deg,#253b38,#52776c)",
    accent: "#e9c793",
    flower: "✧",
    description: "A royal celebration with heritage charm",
  },
  {
    id: "blush-bloom",
    title: "Blush & Bloom",
    category: "Floral",
    price: 899,
    theme: "linear-gradient(145deg,#d9a6a5,#f6ded7)",
    accent: "#763b4a",
    flower: "❁",
    description: "Romantic florals and delicate details",
  },
  {
    id: "golden-hour",
    title: "Golden Hour",
    category: "Modern",
    price: 799,
    theme: "linear-gradient(145deg,#a87c50,#e6cba3)",
    accent: "#fff3d9",
    flower: "✦",
    description: "Warm tones for an unforgettable day",
  },
  {
    id: "midnight-vows",
    title: "Midnight Vows",
    category: "Royal",
    price: 1299,
    theme: "linear-gradient(145deg,#1b243c,#43547d)",
    accent: "#e4c48e",
    flower: "✧",
    description: "Modern luxury after dark",
  },
];
