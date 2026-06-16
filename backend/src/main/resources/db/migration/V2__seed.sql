insert into restaurants (id, name, city, active) values
('11111111-1111-1111-1111-111111111111', 'Los Pollos Central', 'Albuquerque', true),
('22222222-2222-2222-2222-222222222222', 'Los Pollos North Valley', 'Albuquerque', true),
('33333333-3333-3333-3333-333333333333', 'Los Pollos Santa Fe', 'Santa Fe', true),
('44444444-4444-4444-4444-444444444444', 'Los Pollos Las Cruces', 'Las Cruces', true);

insert into restaurant_baselines (id, restaurant_id, average_check, daily_customer_flow, seasonal_coefficient, allowed_deviation_percent) values
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '11111111-1111-1111-1111-111111111111', 13.40, 920, 1.08, 35.00),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '22222222-2222-2222-2222-222222222222', 12.80, 740, 1.03, 35.00),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '33333333-3333-3333-3333-333333333333', 14.10, 520, 0.96, 35.00),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', '44444444-4444-4444-4444-444444444444', 11.90, 610, 1.01, 35.00);

insert into fund_intakes (id, amount, source, split_hours, commission_rate, registered_at, status, owner_decision_comment) values
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 24000.00, 'Training synthetic source A', 48, 0.1200, now(), 'APPROVED', 'Seed intake approved for demo');

insert into fund_batches (id, intake_id, sequence_no, amount) values
('cccccccc-cccc-cccc-cccc-ccccccccccc1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 1, 12000.00),
('cccccccc-cccc-cccc-cccc-ccccccccccc2', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 2, 12000.00);

insert into audit_events (id, occurred_at, actor_role, action, entity_type, entity_id, details) values
('dddddddd-dddd-dddd-dddd-ddddddddddd1', now(), 'ADMIN', 'SYSTEM_SEEDED', 'system', 'seed', 'Loaded synthetic training data');
