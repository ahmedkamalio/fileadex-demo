CREATE TABLE IF NOT EXISTS leads
(
    "id"                   UUID      DEFAULT gen_random_uuid() PRIMARY KEY,
    "name"                 TEXT,
    "email"                TEXT,
    "phone"                TEXT,
    "company"              TEXT,
    "job_title"            TEXT,
    "website"              TEXT,
    "source"               TEXT,
    "crm_id"               TEXT,
    "crm_provider"         TEXT,
    "crm_synced_at"        TIMESTAMP,
    "last_crm_sync_status" TEXT,
    "created_at"           TIMESTAMP DEFAULT NOW()
);

-- Performance Indexes

-- 1. Email lookup index (not unique as email duplication constrains has not been discussed yet)
-- Used for: email-based searches, CRM matching
CREATE INDEX IF NOT EXISTS idx_leads_email
    ON leads(email)
    WHERE email IS NOT NULL;

-- 2. Created at index for chronological queries
-- Used for: dashboard ordering, recent leads, pagination
CREATE INDEX IF NOT EXISTS idx_leads_created_at
    ON leads(created_at DESC);

-- 3. Company search index
-- Used for: company-based filtering, duplicate company detection
CREATE INDEX IF NOT EXISTS idx_leads_company
    ON leads(company)
    WHERE company IS NOT NULL;

-- 4. CRM sync status index
-- Used for: finding unsynced leads, retry logic, sync monitoring
CREATE INDEX IF NOT EXISTS idx_leads_crm_sync_status
    ON leads(last_crm_sync_status, crm_synced_at)
    WHERE last_crm_sync_status IS NOT NULL;

-- 5. CRM provider + external ID index
-- Used for: CRM integration lookups, preventing duplicate syncs
CREATE INDEX IF NOT EXISTS idx_leads_crm_provider_id
    ON leads(crm_provider, crm_id)
    WHERE crm_provider IS NOT NULL AND crm_id IS NOT NULL;

-- 6. Source tracking index
-- Used for: analytics, OCR provider performance analysis
CREATE INDEX IF NOT EXISTS idx_leads_source
    ON leads(source, created_at)
    WHERE source IS NOT NULL;

-- 7. Full-text search index for name and company
-- Used for: dashboard search functionality, lead discovery
CREATE INDEX IF NOT EXISTS idx_leads_search
    ON leads USING gin(to_tsvector('english',
    COALESCE(name, '') || ' ' ||
    COALESCE(company, '') || ' ' ||
    COALESCE(job_title, '')
    ));

-- Data Quality Constraints
-- These ensure data integrity and prevent common issues

-- CRM sync status validation
ALTER TABLE leads ADD CONSTRAINT chk_leads_crm_sync_status
    CHECK (last_crm_sync_status IS NULL OR last_crm_sync_status IN ('pending', 'success', 'failed', 'retry'));
