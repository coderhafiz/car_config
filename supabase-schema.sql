-- =========================================================================
-- CUSTOMLY-U 3D CAR CONFIGURATOR: SUPABASE DATABASE INITIALIZATION
-- =========================================================================
-- Copy and paste this entire script into your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/yfvphxipkzzjkddgtdpp/sql/new
-- Then click "Run".
-- =========================================================================

-- 1. Create table for Bespoke Commission Leads & $5,000 Deposits
CREATE TABLE IF NOT EXISTS commission_leads (
    id TEXT PRIMARY KEY,
    client_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    location TEXT,
    vehicle_model TEXT NOT NULL,
    exterior_finish TEXT,
    exterior_color TEXT,
    wheel_design TEXT,
    wheel_color TEXT,
    glass_tint TEXT,
    caliper_color TEXT,
    active_decals JSONB DEFAULT '[]'::jsonb,
    base_price NUMERIC DEFAULT 0,
    options_total NUMERIC DEFAULT 0,
    total_price NUMERIC DEFAULT 0,
    deposit_status TEXT DEFAULT 'Deposited ($5,000)',
    payment_method TEXT DEFAULT 'Credit Card',
    submitted_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create table for 3D Configurator Telemetry Events
CREATE TABLE IF NOT EXISTS telemetry_events (
    id TEXT PRIMARY KEY,
    event_name TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE commission_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;

-- 4. Policies: Allow the 3D configurator (anon role) to insert and view leads
DROP POLICY IF EXISTS "Allow public insert to commission_leads" ON commission_leads;
CREATE POLICY "Allow public insert to commission_leads" 
    ON commission_leads 
    FOR INSERT 
    TO anon 
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read from commission_leads" ON commission_leads;
CREATE POLICY "Allow public read from commission_leads" 
    ON commission_leads 
    FOR SELECT 
    TO anon 
    USING (true);

DROP POLICY IF EXISTS "Allow public insert to telemetry_events" ON telemetry_events;
CREATE POLICY "Allow public insert to telemetry_events" 
    ON telemetry_events 
    FOR INSERT 
    TO anon 
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read from telemetry_events" ON telemetry_events;
CREATE POLICY "Allow public read from telemetry_events" 
    ON telemetry_events 
    FOR SELECT 
    TO anon 
    USING (true);

-- 5. Seed an initial lead to confirm setup
INSERT INTO commission_leads (
    id, client_name, email, phone, location, vehicle_model, 
    exterior_finish, exterior_color, wheel_design, wheel_color, 
    glass_tint, caliper_color, active_decals, base_price, options_total, total_price, 
    deposit_status, payment_method
) VALUES (
    'CMD-POR-99201', 'Alexander Vance', 'alexander.vance@bespoke.com', '+1 (555) 019-2834', 'Zurich, Switzerland', 'Porsche 911 992',
    'Satin Matte Clearcoat', 'Sandstorm Beige (#d2b48c)', 'Forged Aero Turbine', 'Satin Gold',
    'Limousine 5%', 'Ceramic Red', '["Apex GT Crest"]'::jsonb, 142700, 10600, 153300,
    'Deposited ($5,000)', 'Credit Card'
) ON CONFLICT (id) DO NOTHING;

