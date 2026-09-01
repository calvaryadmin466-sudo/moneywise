BEGIN;

-- USER_ASSETS — DSE ticker + shares held, for live stock pricing
ALTER TABLE public.user_assets
    ADD COLUMN IF NOT EXISTS ticker TEXT;

ALTER TABLE public.user_assets
    ADD COLUMN IF NOT EXISTS shares NUMERIC(18, 4);

COMMIT;
