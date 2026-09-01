export type Recurrence = 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

export const RECURRENCE_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: 'once', label: 'One time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Every 3 months' },
  { value: 'yearly', label: 'Yearly' },
];

export interface BillReminder {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  next_due_date: string;
  recurrence: Recurrence;
  remind_days_before: number;
  is_paid_last: boolean;
  category: string | null;
  asset_id: string | null;
  snooze_until: string | null;
  last_notified_at: string | null;
  created_at: string;
}

export function computeNextDue(currentISO: string, rule: Recurrence): string {
  const d = new Date(currentISO + 'T00:00:00');
  switch (rule) {
    case 'once':
      return currentISO;
    case 'daily':
      d.setDate(d.getDate() + 1);
      break;
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'biweekly':
      d.setDate(d.getDate() + 14);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'quarterly':
      d.setMonth(d.getMonth() + 3);
      break;
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d.toISOString().slice(0, 10);
}

export function computeOccurrences(startISO: string, rule: Recurrence, count: number): string[] {
  const out: string[] = [];
  let current = startISO;
  for (let i = 0; i < count; i++) {
    out.push(current);
    if (rule === 'once') break;
    current = computeNextDue(current, rule);
  }
  return out;
}

export function daysUntil(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(isoDate + 'T00:00:00');
  const ms = target.getTime() - today.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function isOverdue(isoDate: string): boolean {
  return daysUntil(isoDate) < 0;
}

export function isDueSoon(isoDate: string, withinDays: number = 3): boolean {
  const d = daysUntil(isoDate);
  return d >= 0 && d <= withinDays;
}

export function getBillStatus(bill: BillReminder): 'overdue' | 'due-soon' | 'upcoming' | 'snoozed' {
  if (bill.snooze_until) {
    const snoozeDate = new Date(bill.snooze_until);
    if (snoozeDate.getTime() > Date.now()) {
      return 'snoozed';
    }
  }
  if (isOverdue(bill.next_due_date)) return 'overdue';
  if (isDueSoon(bill.next_due_date, bill.remind_days_before || 3)) return 'due-soon';
  return 'upcoming';
}
