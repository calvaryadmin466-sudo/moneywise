export type Transaction = {
  id: string;
  user_id?: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  date: string | Date;
  category: string;
  notes?: string;
  note?: string | null;
  is_recurring?: boolean;
  asset_id?: string | null;
  income_source?: string | null;
  linked_transfer_id?: string | null;
  metadata?: { encrypted_fields?: string[]; [k: string]: unknown } | null;
  created_at?: string;
};

export type Category = {
  id: string;
  name: string;
  type: "income" | "expense";
};
