export interface Transaction {
  id: string;
  type: "DEPOSIT" | "WITHDRAWAL" | "PURCHASE" | "SALE";
  amount: number;
  description: string;
  date: string; // ISO String
  status: "COMPLETED" | "PENDING" | "FAILED";
  hash?: string; // Fake blockchain hash
}

// Helper to generate fake hash
export const genHash = () =>
  "0x" +
  Array(64)
    .fill(0)
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join("");
