-- Update user_assets table constraint to include all asset types from frontend

-- First, drop the existing constraint
ALTER TABLE user_assets DROP CONSTRAINT IF EXISTS user_assets_type_check;

-- Add the updated constraint with all asset types from frontend AssetType enum
ALTER TABLE user_assets 
ADD CONSTRAINT user_assets_type_check 
CHECK (type IN (
  'cash', 
  'bank_account', 
  'mobile_money', 
  'stocks', 
  'bonds', 
  'real_estate', 
  'vehicle', 
  'jewelry', 
  'business', 
  'livestock', 
  'land', 
  'other'
));

-- Add comment to document the allowed values
COMMENT ON COLUMN user_assets.type IS 'Asset type: cash, bank_account, mobile_money, stocks, bonds, real_estate, vehicle, jewelry, business, livestock, land, other';
