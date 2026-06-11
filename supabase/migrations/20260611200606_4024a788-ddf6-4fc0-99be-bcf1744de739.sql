ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS sales_rep text,
  ADD COLUMN IF NOT EXISTS company_size text,
  ADD COLUMN IF NOT EXISTS device_model text,
  ADD COLUMN IF NOT EXISTS end_of_life boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS storage_capacity_tb numeric,
  ADD COLUMN IF NOT EXISTS annual_revenue bigint,
  ADD COLUMN IF NOT EXISTS last_contact_date date,
  ADD COLUMN IF NOT EXISTS pipeline_stage text;