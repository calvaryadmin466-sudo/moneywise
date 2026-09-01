BEGIN;

-- 1) BILL_REMINDERS table — recurring bills + due notifications
CREATE TABLE IF NOT EXISTS public.bill_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    next_due_date DATE NOT NULL,
    recurrence TEXT NOT NULL DEFAULT 'monthly'
        CHECK (recurrence IN ('once','daily','weekly','biweekly','monthly','quarterly','yearly')),
    remind_days_before INTEGER NOT NULL DEFAULT 3 CHECK (remind_days_before BETWEEN 0 AND 30),
    is_paid_last BOOLEAN NOT NULL DEFAULT FALSE,
    category TEXT,
    asset_id UUID REFERENCES public.user_assets(id) ON DELETE SET NULL,
    snooze_until TIMESTAMPTZ,
    last_notified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bill_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bill_reminders_isolate_per_user ON public.bill_reminders;
CREATE POLICY bill_reminders_isolate_per_user ON public.bill_reminders
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_bill_reminders_user_id ON public.bill_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_bill_reminders_next_due ON public.bill_reminders(next_due_date);

-- 2) BUDGETS — add weekly-period + carry-forward support
ALTER TABLE public.budgets
    ADD COLUMN IF NOT EXISTS period TEXT NOT NULL DEFAULT 'monthly'
        CHECK (period IN ('monthly','weekly'));

ALTER TABLE public.budgets
    ADD COLUMN IF NOT EXISTS period_key TEXT;

ALTER TABLE public.budgets
    ADD COLUMN IF NOT EXISTS carry_forward BOOLEAN NOT NULL DEFAULT FALSE;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'budgets_user_id_category_period_key_key'
    ) THEN
        CREATE UNIQUE INDEX budgets_user_id_category_period_key_key
            ON public.budgets(user_id, category, period_key);
    END IF;
END $$;

-- Back-fill period_key from legacy month column for rows still on the old schema
UPDATE public.budgets
    SET period_key = month
    WHERE period_key IS NULL AND month IS NOT NULL;

-- 3) USER_ASSETS — credit card support fields
ALTER TABLE public.user_assets
    ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(18, 2);

ALTER TABLE public.user_assets
    ADD COLUMN IF NOT EXISTS statement_date DATE;

ALTER TABLE public.user_assets
    ADD COLUMN IF NOT EXISTS minimum_payment NUMERIC(18, 2);

-- Allow "credit_card" as an explicit asset type
ALTER TABLE public.user_assets
    ALTER COLUMN type TYPE TEXT;

-- 4) TRANSACTIONS — transfer support + metadata + linked pair
ALTER TABLE public.transactions
    ALTER COLUMN type TYPE TEXT;

ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS linked_transfer_id UUID;

ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMIT;
