-- ===================================
-- INITIAL DATABASE SETUP
-- ===================================

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ===================================
-- INDEXES FOR BETTER PERFORMANCE
-- ===================================

-- These indexes will be created after Prisma migration
-- but we can prepare some custom ones here if needed

-- ===================================
-- INITIAL DATA SEEDING
-- ===================================

-- Note: User seeding will be done via Prisma seeding script
-- This is just for database-level initialization

-- Create a function to generate demo data after tables exist
CREATE OR REPLACE FUNCTION seed_demo_data() 
RETURNS void AS $$
BEGIN
    -- This function will be called after Prisma migration
    -- to insert demo data safely
    RAISE NOTICE 'Database initialized. Demo data will be seeded via Prisma.';
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- LOGGING AND MONITORING SETUP
-- ===================================

-- Enable logging for development
DO $$
BEGIN
    -- Set some useful PostgreSQL settings for development
    PERFORM set_config('log_statement', 'all', false);
    PERFORM set_config('log_min_duration_statement', '100ms', false);
    RAISE NOTICE 'PostgreSQL configured for development environment';
END;
$$;