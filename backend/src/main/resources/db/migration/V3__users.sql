create table app_users (
    id uuid primary key,
    username varchar(80) not null unique,
    password_hash varchar(120) not null,
    role varchar(40) not null,
    enabled boolean not null,
    created_at timestamp with time zone not null
);

insert into app_users (id, username, password_hash, role, enabled, created_at) values
('99999999-9999-9999-9999-999999999991', 'owner', '{noop}owner123', 'OWNER', true, now());
