create table restaurants (
    id uuid primary key,
    name varchar(120) not null,
    city varchar(80) not null,
    active boolean not null
);

create table restaurant_baselines (
    id uuid primary key,
    restaurant_id uuid not null references restaurants(id),
    average_check numeric(14,2) not null,
    daily_customer_flow integer not null,
    seasonal_coefficient numeric(8,4) not null,
    allowed_deviation_percent numeric(8,2) not null
);

create table fund_intakes (
    id uuid primary key,
    amount numeric(14,2) not null,
    source varchar(120) not null,
    split_hours integer not null,
    commission_rate numeric(8,4) not null,
    registered_at timestamp with time zone not null,
    status varchar(40) not null,
    owner_decision_comment varchar(500)
);

create table fund_batches (
    id uuid primary key,
    intake_id uuid not null references fund_intakes(id),
    sequence_no integer not null,
    amount numeric(14,2) not null
);

create table distribution_plans (
    id uuid primary key,
    intake_id uuid not null references fund_intakes(id),
    created_at timestamp with time zone not null,
    status varchar(40) not null,
    total_amount numeric(14,2) not null,
    version integer not null
);

create table distribution_plan_items (
    id uuid primary key,
    plan_id uuid not null references distribution_plans(id),
    restaurant_id uuid not null references restaurants(id),
    restaurant_name varchar(120) not null,
    planned_amount numeric(14,2) not null,
    baseline_capacity numeric(14,2) not null,
    deviation_percent numeric(8,2) not null
);

create table cash_operations (
    id uuid primary key,
    plan_id uuid not null references distribution_plans(id),
    restaurant_id uuid not null references restaurants(id),
    restaurant_name varchar(120) not null,
    menu_item varchar(120) not null,
    quantity integer not null,
    unit_price numeric(14,2) not null,
    total_amount numeric(14,2) not null,
    operation_time timestamp with time zone not null,
    status varchar(40) not null
);

create table audit_events (
    id uuid primary key,
    occurred_at timestamp with time zone not null,
    actor_role varchar(40) not null,
    action varchar(80) not null,
    entity_type varchar(80) not null,
    entity_id varchar(80) not null,
    details varchar(500) not null
);
