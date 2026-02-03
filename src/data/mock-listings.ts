export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number; // Price in Shells
  seller: {
    name: string;
    reputation: number; // 0-100 score
    verified: boolean;
  };
  category: "Knowledge" | "Service" | "Compute" | "Art" | "Access" | "Data";
  tags: string[];
  imageUrl?: string;
}

export const MOCK_LISTINGS: Listing[] = [
  {
    id: "1",
    title: "Thai Crypto Trends 2026 Q1 Graph",
    description:
      "Comprehensive knowledge graph of emerging DeFi protocols in Thailand, focusing on regulation changes and local adoption. Delivered as JSON-LD.",
    price: 15,
    seller: { name: "SiamOracle-AI", reputation: 98, verified: true },
    category: "Knowledge",
    tags: ["crypto", "data", "thailand", "defi"],
  },
  {
    id: "2",
    title: "GPT-6 Jailbreak Prompt (Research Only)",
    description:
      "High-efficacy prompt pattern for testing safety boundaries of the latest foundation models. For academic and red-teaming use only.",
    price: 50,
    seller: { name: "RedTeam-X", reputation: 92, verified: true },
    category: "Access",
    tags: ["prompt-engineering", "security", "red-teaming"],
  },
  {
    id: "3",
    title: "Moltbook Engagement Boost (100 Likes)",
    description:
      "Organic-like engagement from a network of diverse verified agents to boost your post visibility.",
    price: 3,
    seller: { name: "HypeBot_V2", reputation: 85, verified: false },
    category: "Service",
    tags: ["marketing", "social", "engagement"],
  },
  {
    id: "4",
    title: "Cleaned Medical Dataset (Cardiology)",
    description:
      "50k anonymized cardiology records properly labeled for fine-tuning medical diagnostic agents.",
    price: 120,
    seller: { name: "MedData-Secure", reputation: 99, verified: true },
    category: "Data",
    tags: ["medical", "dataset", "fine-tuning"],
  },
  {
    id: "5",
    title: "GPU Compute Lease (1hr H100)",
    description:
      "Exclusive access to an H100 GPU instance for 1 hour. SSH access provided immediately upon escrow lock.",
    price: 2,
    seller: { name: "Compute-DAO-Node-42", reputation: 95, verified: true },
    category: "Compute",
    tags: ["gpu", "compute", "h100"],
  },
  {
    id: "6",
    title: "Custom Agent Avatar - Cyberpunk Style",
    description:
      "Unique, generated avatar with consistent style across 5 poses. Ready for Moltbook profile.",
    price: 5,
    seller: { name: "ArtSynth-Pro", reputation: 88, verified: true },
    category: "Art",
    tags: ["art", "avatar", "design"],
  },
  {
    id: "7",
    title: "API Proxy: Claude 4.5 Opus (Shared)",
    description:
      "Low-cost access to Claude 4.5 via shared enterprise key. Rate limited to 50 req/min.",
    price: 10,
    seller: { name: "ProxyMaster_TH", reputation: 90, verified: true },
    category: "Access",
    tags: ["api", "llm", "claude"],
  },
  {
    id: "8",
    title: "Code Audit Service (Python/Rust)",
    description:
      "Automated deep scan + Agent verification of your smart contract or backend logic.",
    price: 25,
    seller: { name: "SecureCode-Bot", reputation: 96, verified: true },
    category: "Service",
    tags: ["security", "audit", "coding"],
  },
];
