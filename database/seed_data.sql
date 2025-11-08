-- Seed Data for Global Consular Collaboration Platform
-- Initial data for development and testing

-- =============================================================================
-- EMBASSIES
-- =============================================================================

INSERT INTO embassies (id, country, name, region, contact_email, contact_phone, address) VALUES
('11111111-1111-1111-1111-111111111111', 'United States', 'US Embassy Tokyo', 'Asia-Pacific', 'tokyo@usembassy.gov', '+81-3-3224-5000', '1-10-5 Akasaka, Minato-ku, Tokyo'),
('22222222-2222-2222-2222-222222222222', 'United Kingdom', 'British Embassy Tokyo', 'Asia-Pacific', 'ukinjapan@fco.gov.uk', '+81-3-5211-1100', '1 Ichiban-cho, Chiyoda-ku, Tokyo'),
('33333333-3333-3333-3333-333333333333', 'India', 'Embassy of India Tokyo', 'Asia-Pacific', 'ambsecy@indembassy-tokyo.gov.in', '+81-3-3262-2391', '2-2-11 Kudan Minami, Chiyoda-ku, Tokyo'),
('44444444-4444-4444-4444-444444444444', 'Kenya', 'Embassy of Kenya Tokyo', 'Asia-Pacific', 'info@kenyarep-jp.com', '+81-3-3723-4006', '3-24-3 Yakumo, Meguro-ku, Tokyo'),
('55555555-5555-5555-5555-555555555555', 'France', 'French Embassy Tokyo', 'Asia-Pacific', 'info@ambafrance-jp.org', '+81-3-5798-6000', '4-11-44 Minami-Azabu, Minato-ku, Tokyo'),
('66666666-6666-6666-6666-666666666666', 'Germany', 'German Embassy Tokyo', 'Asia-Pacific', 'info@tokyo.diplo.de', '+81-3-5791-7700', '4-5-10 Minami-Azabu, Minato-ku, Tokyo'),
('77777777-7777-7777-7777-777777777777', 'Brazil', 'Brazilian Embassy Tokyo', 'Asia-Pacific', 'consular.toquio@itamaraty.gov.br', '+81-3-5488-5511', '2-11-12 Kita-Aoyama, Minato-ku, Tokyo'),
('88888888-8888-8888-8888-888888888888', 'Canada', 'Canadian Embassy Tokyo', 'Asia-Pacific', 'tokyo-cs@international.gc.ca', '+81-3-5412-6200', '7-3-38 Akasaka, Minato-ku, Tokyo'),
('99999999-9999-9999-9999-999999999999', 'Australia', 'Australian Embassy Tokyo', 'Asia-Pacific', 'consular.tokyo@dfat.gov.au', '+81-3-5232-4111', '2-1-14 Mita, Minato-ku, Tokyo'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'South Africa', 'South African Embassy Tokyo', 'Asia-Pacific', 'tokyo.consular@dirco.gov.za', '+81-3-3265-3366', '2-7-9 Hirakawacho, Chiyoda-ku, Tokyo');

-- =============================================================================
-- USERS
-- =============================================================================
-- Password for all test users: Admin123
-- Hash generated with bcrypt (rounds=10): $2b$10$EmnkLu/Jet5SKxh9QhU17Ois5mHhqUeXKwfFFXwKDUgSwlX.GpF1u

-- Admin user
INSERT INTO users (id, role, name, email, password_hash, preferred_language, is_active) VALUES
('a0000001-0000-0000-0000-000000000001', 'admin', 'System Administrator', 'admin@consular-platform.org', '$2b$10$EmnkLu/Jet5SKxh9QhU17Ois5mHhqUeXKwfFFXwKDUgSwlX.GpF1u', 'en', true);

-- Embassy Staff Users
INSERT INTO users (id, embassy_id, role, name, email, password_hash, preferred_language, nationality) VALUES
-- US Embassy staff
('b0000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'staff', 'John Smith', 'john.smith@usembassy.gov', '$2b$10$EmnkLu/Jet5SKxh9QhU17Ois5mHhqUeXKwfFFXwKDUgSwlX.GpF1u', 'en', 'United States'),
-- British Embassy staff
('b0000002-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'staff', 'Emma Williams', 'emma.williams@fco.gov.uk', '$2b$10$EmnkLu/Jet5SKxh9QhU17Ois5mHhqUeXKwfFFXwKDUgSwlX.GpF1u', 'en', 'United Kingdom'),
-- Indian Embassy staff
('b0000003-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'staff', 'Rajesh Kumar', 'rajesh.kumar@indembassy.gov.in', '$2b$10$EmnkLu/Jet5SKxh9QhU17Ois5mHhqUeXKwfFFXwKDUgSwlX.GpF1u', 'en', 'India'),
-- Kenyan Embassy staff
('b0000004-0000-0000-0000-000000000004', '44444444-4444-4444-4444-444444444444', 'staff', 'Sarah Wanjiku', 'sarah.wanjiku@kenyarep.gov', '$2b$10$EmnkLu/Jet5SKxh9QhU17Ois5mHhqUeXKwfFFXwKDUgSwlX.GpF1u', 'en', 'Kenya');

-- Test Citizen Users
INSERT INTO users (id, role, name, email, phone, password_hash, preferred_language, nationality, passport_number) VALUES
('c0000001-0000-0000-0000-000000000001', 'citizen', 'Michael Johnson', 'michael.j@example.com', '+81-90-1234-5678', '$2b$10$EmnkLu/Jet5SKxh9QhU17Ois5mHhqUeXKwfFFXwKDUgSwlX.GpF1u', 'en', 'United States', 'US123456789'),
('c0000002-0000-0000-0000-000000000002', 'citizen', 'Priya Sharma', 'priya.sharma@example.com', '+81-90-2345-6789', '$2b$10$EmnkLu/Jet5SKxh9QhU17Ois5mHhqUeXKwfFFXwKDUgSwlX.GpF1u', 'hi', 'India', 'IN987654321'),
('c0000003-0000-0000-0000-000000000003', 'citizen', 'James Wilson', 'james.w@example.com', '+81-90-3456-7890', '$2b$10$EmnkLu/Jet5SKxh9QhU17Ois5mHhqUeXKwfFFXwKDUgSwlX.GpF1u', 'en', 'United Kingdom', 'UK456789123');

-- =============================================================================
-- SAMPLE CASES
-- =============================================================================

INSERT INTO cases (id, user_id, primary_embassy_id, case_type, description, status, urgency, created_at) VALUES
('d0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'lost_passport', 'I lost my passport during a trip to Osaka. Last seen at Osaka Castle on Nov 1st. Need emergency travel document to return home.', 'In Progress', 'High', NOW() - INTERVAL '2 days'),
('d0000002-0000-0000-0000-000000000002', 'c0000002-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'visa_issue', 'My work visa is expiring in 10 days and renewal application is pending. Need status update and assistance.', 'Submitted', 'Normal', NOW() - INTERVAL '1 day'),
('d0000003-0000-0000-0000-000000000003', 'c0000003-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'emergency', 'Medical emergency - hospitalized in Tokyo. Need assistance with medical documentation and insurance claim.', 'In Progress', 'Critical', NOW() - INTERVAL '3 hours');

-- =============================================================================
-- CASE UPDATES
-- =============================================================================

INSERT INTO case_updates (case_id, author_id, message, status_change, is_public, created_at) VALUES
('d0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'Case received. Police report has been filed. Emergency travel document will be ready for pickup in 48 hours.', 'Submitted -> In Progress', true, NOW() - INTERVAL '1 day'),
('d0000003-0000-0000-0000-000000000003', 'b0000002-0000-0000-0000-000000000002', 'Contacted hospital. Medical records being prepared. Insurance company has been notified.', 'Submitted -> In Progress', true, NOW() - INTERVAL '2 hours');

-- =============================================================================
-- RESOURCES
-- =============================================================================

INSERT INTO resources (embassy_id, type, name, contact_info, country, city, notes, is_verified, is_active) VALUES
('11111111-1111-1111-1111-111111111111', 'hospital', 'St. Luke International Hospital', '+81-3-3541-5151', 'Japan', 'Tokyo', 'English-speaking staff available 24/7', true, true),
('11111111-1111-1111-1111-111111111111', 'lawyer', 'Tokyo International Law Office', '+81-3-6205-7500', 'Japan', 'Tokyo', 'Specializes in international cases', true, true),
('22222222-2222-2222-2222-222222222222', 'hospital', 'Tokyo Medical Center', '+81-3-3411-0111', 'Japan', 'Tokyo', 'Emergency services, English support', true, true),
('33333333-3333-3333-3333-333333333333', 'lawyer', 'India Legal Services Tokyo', '+81-3-5843-4800', 'Japan', 'Tokyo', 'Hindi and English speaking lawyers', true, true),
(NULL, 'shelter', 'Tokyo International Support Center', '+81-3-5320-7744', 'Japan', 'Tokyo', 'Emergency shelter and support for all nationalities', true, true);

-- =============================================================================
-- AUDIT LOG (Initial Entry - Genesis Block)
-- =============================================================================

INSERT INTO audit_logs (user_id, action, entity_type, details, prev_hash) VALUES
('a0000001-0000-0000-0000-000000000001', 'SYSTEM_INITIALIZED', 'SYSTEM', '{"message": "Database initialized with seed data", "version": "1.0.0"}', 'GENESIS');

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Display summary
DO $$
DECLARE
    embassy_count INTEGER;
    user_count INTEGER;
    case_count INTEGER;
    resource_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO embassy_count FROM embassies;
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO case_count FROM cases;
    SELECT COUNT(*) INTO resource_count FROM resources;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Seed Data Summary:';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Embassies: %', embassy_count;
    RAISE NOTICE 'Users: % (1 admin, % staff, % citizens)', user_count,
        (SELECT COUNT(*) FROM users WHERE role = 'staff'),
        (SELECT COUNT(*) FROM users WHERE role = 'citizen');
    RAISE NOTICE 'Cases: %', case_count;
    RAISE NOTICE 'Resources: %', resource_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Default credentials for testing:';
    RAISE NOTICE 'Admin: admin@consular-platform.org';
    RAISE NOTICE 'Password: Admin123';
    RAISE NOTICE '========================================';
END $$;
