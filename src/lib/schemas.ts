import { z } from "zod";

export const transactionSchema = z.object({
  type: z.enum(["income", "expense", "transfer"], {
    required_error: "Please select a transaction type.",
  }),
  amount: z.coerce.number().positive({ message: "Amount must be a positive number." }),
  date: z.date({
    required_error: "Please select a date.",
  }),
  category: z.string().min(1, { message: "Please select a category." }),
  notes: z.string().max(100, "Notes must be 100 characters or less.").optional(),
  asset_id: z.string().optional(),
  linked_transfer_id: z.string().optional(),
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;

export const billReminderSchema = z.object({
  title: z.string().min(1, "Title is required").max(60, "Title too long (60 chars max)"),
  amount: z.coerce.number().positive("Amount must be positive"),
  next_due_date: z.string().min(1, "Due date is required"),
  recurrence: z.enum(["once", "daily", "weekly", "biweekly", "monthly", "quarterly", "yearly"]),
  remind_days_before: z.coerce.number().int().min(0).max(30).default(3),
  category: z.string().optional(),
  asset_id: z.string().optional(),
});

export type BillReminderFormValues = z.infer<typeof billReminderSchema>;

export const budgetSchema = z.object({
  category: z.string().min(1, "Category is required"),
  monthly_limit: z.coerce.number().nonnegative("Limit must be >= 0"),
  period: z.enum(["monthly", "weekly"]).default("monthly"),
  period_key: z.string().min(1, "Period key is required"),
  carry_forward: z.boolean().default(false),
});

export type BudgetFormValues = z.infer<typeof budgetSchema>;

export const transferSchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive"),
  from_asset_id: z.string().min(1, "Source account is required"),
  to_asset_id: z.string().min(1, "Destination account is required"),
  date: z.string().min(1, "Date is required"),
  note: z.string().max(100, "Note too long (100 chars max)").optional(),
  fee: z.coerce.number().nonnegative("Fee must be >= 0").default(0),
}).refine((d) => d.from_asset_id !== d.to_asset_id, {
  message: "Source and destination must be different accounts",
  path: ["to_asset_id"],
});

export type TransferFormValues = z.infer<typeof transferSchema>;

