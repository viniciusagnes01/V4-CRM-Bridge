create extension if not exists pgcrypto;

create table if not exists v4_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  role text default 'Account',
  status text default 'Ativo',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists v4_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  account text,
  sheet text,
  status text default 'Ativo',
  last_sync text,
  records integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists v4_integrations (
  id uuid primary key default gen_random_uuid(),
  client text not null,
  crm text not null,
  alias text,
  base_url text,
  pipeline text,
  pipeline_name text,
  trigger text,
  destination text default 'TESTE_BASE_CRM',
  frequency text default 'Manual',
  write_mode text default 'upsert',
  status text default 'Ativo',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists v4_logs (
  id uuid primary key default gen_random_uuid(),
  type text default 'info',
  message text not null,
  at text,
  created_at timestamptz default now()
);

create or replace function v4_touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_v4_accounts_updated_at on v4_accounts;
create trigger trg_v4_accounts_updated_at before update on v4_accounts for each row execute function v4_touch_updated_at();

drop trigger if exists trg_v4_clients_updated_at on v4_clients;
create trigger trg_v4_clients_updated_at before update on v4_clients for each row execute function v4_touch_updated_at();

drop trigger if exists trg_v4_integrations_updated_at on v4_integrations;
create trigger trg_v4_integrations_updated_at before update on v4_integrations for each row execute function v4_touch_updated_at();
