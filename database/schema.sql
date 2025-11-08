-- Global Consular Collaboration Platform Database Schema
-- PostgreSQL 13+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables if they exist (for development - be careful in production!)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS resources CASCADE;
DROP TABLE IF EXISTS assistance_requests CASCADE;
DROP TABLE IF EXISTS case_updates CASCADE;
DROP TABLE IF EXISTS cases CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS embassies CASCADE;

-- =============================================================================
-- EMBASSIES TABLE
-- =============================================================================
CREATE TABLE embassies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country VARCHAR(100) NOT NULL,
    name VARCHAR(150) NOT NULL,
    region VARCHAR(100),
    public_key TEXT,
    contact_email VARCHAR(100),
    contact_phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_embassies_country ON embassies(country);
CREATE INDEX idx_embassies_region ON embassies(region);

-- =============================================================================
-- USERS TABLE
-- =============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    embassy_id UUID REFERENCES embassies(id) ON DELETE SET NULL,
    role VARCHAR(20) NOT NULL CHECK(role IN ('citizen','staff','admin')),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash TEXT NOT NULL,
    preferred_language VARCHAR(10) DEFAULT 'en',
    nationality VARCHAR(100),
    passport_number VARCHAR(50),
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_embassy ON users(embassy_id);
CREATE INDEX idx_users_role ON users(role);

-- =============================================================================
-- CASES TABLE
-- =============================================================================
CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    primary_embassy_id UUID REFERENCES embassies(id) NOT NULL,
    assisting_embassy_id UUID REFERENCES embassies(id),
    case_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Submitted',
    urgency VARCHAR(10) NOT NULL DEFAULT 'Normal' CHECK(urgency IN ('Low','Normal','High','Critical')),
    resolution_notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP,
    sla_deadline TIMESTAMP
);

CREATE INDEX idx_cases_user ON cases(user_id);
CREATE INDEX idx_cases_primary_embassy ON cases(primary_embassy_id);
CREATE INDEX idx_cases_assisting_embassy ON cases(assisting_embassy_id);
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_urgency ON cases(urgency);
CREATE INDEX idx_cases_type ON cases(case_type);
CREATE INDEX idx_cases_created_at ON cases(created_at DESC);

-- Function to generate case numbers
CREATE OR REPLACE FUNCTION generate_case_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.case_number := 'CASE-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('case_number_seq')::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS case_number_seq;

CREATE TRIGGER set_case_number
BEFORE INSERT ON cases
FOR EACH ROW
WHEN (NEW.case_number IS NULL)
EXECUTE FUNCTION generate_case_number();

-- =============================================================================
-- CASE UPDATES TABLE
-- =============================================================================
CREATE TABLE case_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    message TEXT,
    status_change VARCHAR(50),
    is_public BOOLEAN DEFAULT FALSE,
    attachments JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_case_updates_case ON case_updates(case_id);
CREATE INDEX idx_case_updates_author ON case_updates(author_id);
CREATE INDEX idx_case_updates_created ON case_updates(created_at DESC);

-- =============================================================================
-- ASSISTANCE REQUESTS TABLE
-- =============================================================================
CREATE TABLE assistance_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
    from_embassy UUID REFERENCES embassies(id) NOT NULL,
    to_embassy UUID REFERENCES embassies(id) NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected','completed')),
    note TEXT,
    response_note TEXT,
    digital_signature TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    responded_at TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX idx_assistance_case ON assistance_requests(case_id);
CREATE INDEX idx_assistance_from ON assistance_requests(from_embassy);
CREATE INDEX idx_assistance_to ON assistance_requests(to_embassy);
CREATE INDEX idx_assistance_status ON assistance_requests(status);

-- =============================================================================
-- RESOURCES TABLE
-- =============================================================================
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    embassy_id UUID REFERENCES embassies(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    contact_info TEXT,
    country VARCHAR(100),
    city VARCHAR(100),
    notes TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_resources_type ON resources(type);
CREATE INDEX idx_resources_country ON resources(country);
CREATE INDEX idx_resources_city ON resources(city);
CREATE INDEX idx_resources_embassy ON resources(embassy_id);

-- =============================================================================
-- AUDIT LOGS TABLE
-- =============================================================================
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    embassy_id UUID REFERENCES embassies(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    prev_hash TEXT,
    hash TEXT
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_embassy ON audit_logs(embassy_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);

-- Function to calculate hash for audit log
CREATE OR REPLACE FUNCTION calculate_audit_hash()
RETURNS TRIGGER AS $$
DECLARE
    prev_hash_value TEXT;
    content TEXT;
BEGIN
    -- Get previous hash
    SELECT hash INTO prev_hash_value FROM audit_logs ORDER BY id DESC LIMIT 1;
    NEW.prev_hash := COALESCE(prev_hash_value, 'GENESIS');

    -- Calculate hash of current entry
    content := NEW.id || NEW.timestamp || COALESCE(NEW.user_id::TEXT, '') ||
               COALESCE(NEW.action, '') || COALESCE(NEW.details::TEXT, '') || NEW.prev_hash;
    NEW.hash := encode(digest(content, 'sha256'), 'hex');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_audit_hash
BEFORE INSERT ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION calculate_audit_hash();

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on cases table
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY cases_by_embassy ON cases
USING (
    -- Allow if user is admin
    current_setting('app.current_role', true) = 'admin'
    OR
    -- Allow if embassy matches (primary or assisting)
    current_setting('app.current_embassy', true)::UUID = primary_embassy_id
    OR
    current_setting('app.current_embassy', true)::UUID = assisting_embassy_id
    OR
    -- Allow if user is the citizen who created the case
    current_setting('app.current_user', true)::UUID = user_id
);

-- Enable RLS on case_updates table
ALTER TABLE case_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY updates_by_embassy ON case_updates
USING (
    current_setting('app.current_role', true) = 'admin'
    OR
    current_setting('app.current_embassy', true)::UUID IN (
        SELECT primary_embassy_id FROM cases WHERE cases.id = case_updates.case_id
        UNION
        SELECT assisting_embassy_id FROM cases WHERE cases.id = case_updates.case_id
    )
    OR
    -- Allow citizen to see public updates on their case
    (current_setting('app.current_user', true)::UUID IN (
        SELECT user_id FROM cases WHERE cases.id = case_updates.case_id
    ) AND case_updates.is_public = true)
);

-- Enable RLS on assistance_requests table
ALTER TABLE assistance_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY requests_by_embassy ON assistance_requests
USING (
    current_setting('app.current_role', true) = 'admin'
    OR
    current_setting('app.current_embassy', true)::UUID = from_embassy
    OR
    current_setting('app.current_embassy', true)::UUID = to_embassy
);

-- Enable RLS on resources table
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY resources_access ON resources
USING (
    -- Resources are viewable by all authenticated users
    current_setting('app.current_role', true) IN ('admin', 'staff', 'citizen')
);

-- Enable RLS on audit_logs table (admin only)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_admin_only ON audit_logs
USING (
    current_setting('app.current_role', true) = 'admin'
);

-- =============================================================================
-- VIEWS
-- =============================================================================

-- View for case statistics by embassy
CREATE OR REPLACE VIEW embassy_case_stats AS
SELECT
    e.id as embassy_id,
    e.name as embassy_name,
    COUNT(DISTINCT c.id) as total_cases,
    COUNT(DISTINCT CASE WHEN c.status = 'Submitted' THEN c.id END) as submitted_cases,
    COUNT(DISTINCT CASE WHEN c.status = 'In Progress' THEN c.id END) as in_progress_cases,
    COUNT(DISTINCT CASE WHEN c.status = 'Resolved' THEN c.id END) as resolved_cases,
    COUNT(DISTINCT CASE WHEN c.urgency = 'High' OR c.urgency = 'Critical' THEN c.id END) as urgent_cases,
    AVG(EXTRACT(EPOCH FROM (COALESCE(c.resolved_at, NOW()) - c.created_at)) / 86400) as avg_resolution_days
FROM embassies e
LEFT JOIN cases c ON e.id = c.primary_embassy_id
GROUP BY e.id, e.name;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE embassies IS 'Participating embassies and consulates';
COMMENT ON TABLE users IS 'All system users (citizens, embassy staff, admins)';
COMMENT ON TABLE cases IS 'Consular assistance cases';
COMMENT ON TABLE case_updates IS 'History of updates and messages for each case';
COMMENT ON TABLE assistance_requests IS 'Requests for inter-embassy collaboration';
COMMENT ON TABLE resources IS 'Shared directory of local resources (lawyers, hospitals, etc.)';
COMMENT ON TABLE audit_logs IS 'Tamper-evident audit trail of all system actions';

-- =============================================================================
-- GRANT PERMISSIONS (adjust based on your DB user setup)
-- =============================================================================

-- Grant appropriate permissions to application database user
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO consular_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO consular_app_user;
