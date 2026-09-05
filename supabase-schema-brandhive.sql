-- BrandHive WhatsApp AI Agent -- production database foundation
-- Project: BrandHive WhatsApp AI Agent (Supabase org: BrandHive Studio)
-- Project ref: koyedzjnwxbjzotnhvtg
--
-- This is the authoritative schema for the current (koyedzjnwxbjzotnhvtg) project.
-- It supersedes supabase-schema.sql and supabase-schema-security.sql, both of
-- which described the abandoned tutorial project and are kept only as history.
--
-- Applied via Supabase MCP apply_migration as migration "brandhive_schema_foundation".
-- No tutorial/dental business data, no auth users, and no secrets are created here.

-- =========================================================
-- 1. profiles -- staff/admin authorization
-- =========================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'staff' check (role in ('admin', 'staff')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- 2. conversations
-- =========================================================
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,
  name text,
  mode text not null default 'agent' check (mode in ('agent', 'human')),
  language text,
  lead_status text not null default 'new'
    check (lead_status in ('new', 'contacted', 'qualified', 'quoted', 'won', 'lost', 'spam')),
  assigned_to uuid references profiles(id) on delete set null,
  service_interest text,
  needs_human boolean not null default false,
  last_customer_message_at timestamptz,
  last_agent_message_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- =========================================================
-- 3. messages
-- =========================================================
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  whatsapp_msg_id text unique,
  whatsapp_type text not null default 'text'
    check (whatsapp_type in ('text', 'image', 'video', 'audio', 'document', 'location',
                              'template', 'interactive', 'sticker', 'contacts', 'unknown')),
  direction text check (direction in ('in', 'out')),
  media_url text,
  wa_status text check (wa_status in ('sent', 'delivered', 'read', 'failed')),
  ai_reply_sent boolean not null default false,
  error text,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 4. services -- authoritative BrandHive pricing/knowledge source
-- =========================================================
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  category text,
  pricing_type text not null check (pricing_type in ('fixed', 'starting_from', 'custom_quote')),
  price numeric(12, 2),
  starting_price numeric(12, 2),
  currency text not null default 'LKR',
  unit text,
  active boolean not null default true,
  display_order integer not null default 0,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- item_type / ad_budget_separate added by migration
  -- "services_item_type_and_ad_budget" (Phase 3 Step 2C):
  --   item_type distinguishes a standalone service from a package/bundle.
  --   ad_budget_separate flags a service whose published fee excludes a
  --   customer-controlled advertising budget BrandHive does not fix or
  --   invent (e.g. catalog entry "LKR 25,000 + Ad Budget"). Default 'service'
  --   / false is the safe default: an unclassified row behaves as a plain
  --   standalone service with no implied bundle inclusions or hidden budget.
  item_type text not null default 'service' check (item_type in ('service', 'package')),
  ad_budget_separate boolean not null default false,
  constraint services_pricing_consistency check (
    (pricing_type = 'fixed' and price is not null)
    or (pricing_type = 'starting_from' and starting_price is not null)
    or (pricing_type = 'custom_quote')
  ),
  constraint services_price_nonnegative check (price is null or price >= 0),
  constraint services_starting_price_nonnegative check (starting_price is null or starting_price >= 0)
);

-- =========================================================
-- 5. service_addons
-- =========================================================
create table if not exists service_addons (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references services(id) on delete cascade,
  name text not null,
  description text,
  pricing_type text not null check (pricing_type in ('fixed', 'starting_from', 'custom_quote')),
  price numeric(12, 2),
  starting_price numeric(12, 2),
  currency text not null default 'LKR',
  unit text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_addons_pricing_consistency check (
    (pricing_type = 'fixed' and price is not null)
    or (pricing_type = 'starting_from' and starting_price is not null)
    or (pricing_type = 'custom_quote')
  ),
  constraint service_addons_price_nonnegative check (price is null or price >= 0),
  constraint service_addons_starting_price_nonnegative check (starting_price is null or starting_price >= 0)
);

-- =========================================================
-- 6. faqs
-- =========================================================
create table if not exists faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text,
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- 7. settings -- key/value business config, not hardcoded in the AI prompt
-- =========================================================
create table if not exists settings (
  key text primary key,
  value jsonb not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- 8. notes -- internal staff notes, never sent to the customer
-- =========================================================
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  author_id uuid references profiles(id) on delete set null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- 9. lead_events -- lead lifecycle audit trail
-- =========================================================
create table if not exists lead_events (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  event_type text not null,
  event_data jsonb,
  actor_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 10. Helper function: is the current auth session an active staff member?
--     SECURITY DEFINER so this can be safely referenced inside RLS policies
--     on `profiles` itself without recursive-policy evaluation.
-- =========================================================
create or replace function is_active_staff()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.is_active
  );
$$;

-- =========================================================
-- 11. Row Level Security
--     Model: active staff (per profiles.is_active) get read/write access to
--     application data via policies below; the webhook and API routes use
--     the service-role key server-side, which bypasses RLS entirely and is
--     unaffected. No table gets a permissive USING (true) policy.
-- =========================================================
alter table profiles enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table services enable row level security;
alter table service_addons enable row level security;
alter table faqs enable row level security;
alter table settings enable row level security;
alter table notes enable row level security;
alter table lead_events enable row level security;

-- profiles: a user can always read their own row; any active staff member
-- can read the full roster (needed later for assignment dropdowns).
-- No insert/update/delete policy for authenticated -- profile management
-- stays a service-role/backend operation for now.
create policy "profiles_select_own" on profiles
  for select to authenticated
  using (id = auth.uid());

create policy "profiles_select_staff" on profiles
  for select to authenticated
  using (is_active_staff());

-- conversations
create policy "conversations_select_staff" on conversations
  for select to authenticated
  using (is_active_staff());

create policy "conversations_insert_staff" on conversations
  for insert to authenticated
  with check (is_active_staff());

create policy "conversations_update_staff" on conversations
  for update to authenticated
  using (is_active_staff())
  with check (is_active_staff());

-- messages (select + insert only -- no update/delete policy for authenticated)
create policy "messages_select_staff" on messages
  for select to authenticated
  using (is_active_staff());

create policy "messages_insert_staff" on messages
  for insert to authenticated
  with check (is_active_staff());

-- services / service_addons / faqs: read-only for staff at this stage.
-- Write access (an admin content-management UI) is deferred to the
-- BrandHive knowledge-base follow-up phase.
create policy "services_select_staff" on services
  for select to authenticated
  using (is_active_staff());

create policy "service_addons_select_staff" on service_addons
  for select to authenticated
  using (is_active_staff());

create policy "faqs_select_staff" on faqs
  for select to authenticated
  using (is_active_staff());

-- settings: read-only for staff; writes are service-role only (controlled
-- server-side access, per the approved architecture).
create policy "settings_select_staff" on settings
  for select to authenticated
  using (is_active_staff());

-- notes (select + insert only for now)
create policy "notes_select_staff" on notes
  for select to authenticated
  using (is_active_staff());

create policy "notes_insert_staff" on notes
  for insert to authenticated
  with check (is_active_staff());

-- lead_events (select + insert only for now)
create policy "lead_events_select_staff" on lead_events
  for select to authenticated
  using (is_active_staff());

create policy "lead_events_insert_staff" on lead_events
  for insert to authenticated
  with check (is_active_staff());

-- =========================================================
-- 12. Indexes
-- =========================================================
create index if not exists idx_conversations_updated on conversations(updated_at desc);
create index if not exists idx_conversations_assigned_to on conversations(assigned_to);
create index if not exists idx_conversations_lead_status on conversations(lead_status);

create index if not exists idx_messages_conversation_created on messages(conversation_id, created_at);

create index if not exists idx_services_category on services(category);
create index if not exists idx_services_active on services(active);
create index if not exists idx_services_item_type on services(item_type);

create index if not exists idx_service_addons_service on service_addons(service_id);

create index if not exists idx_faqs_category on faqs(category);
create index if not exists idx_faqs_active on faqs(active);

create index if not exists idx_notes_conversation on notes(conversation_id);

create index if not exists idx_lead_events_conversation_created on lead_events(conversation_id, created_at);

-- =========================================================
-- 13. updated_at auto-maintenance (append-only tables excluded)
-- =========================================================
create or replace function set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger set_updated_at before update on conversations
  for each row execute function set_updated_at();
create trigger set_updated_at before update on services
  for each row execute function set_updated_at();
create trigger set_updated_at before update on service_addons
  for each row execute function set_updated_at();
create trigger set_updated_at before update on faqs
  for each row execute function set_updated_at();
create trigger set_updated_at before update on settings
  for each row execute function set_updated_at();
create trigger set_updated_at before update on notes
  for each row execute function set_updated_at();

-- =========================================================
-- 14. Realtime -- preserves the existing dashboard's live-update feature
-- =========================================================
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table conversations;

-- =========================================================
-- 15. service_role table-level SELECT grants (Phase 4 Step 1F)
--     Applied via Supabase MCP apply_migration as migration
--     "grant_service_role_select_knowledge_tables".
--
--     Discovered during live AI validation: service_role had only
--     structural (REFERENCES/TRIGGER/TRUNCATE) privileges on every table
--     in this project -- no SELECT/INSERT/UPDATE/DELETE anywhere -- so the
--     server-side knowledge tools (search_services, get_service_pricing,
--     list_addons, search_faqs, get_business_info) failed with Postgres
--     42501 "permission denied" on every call. RLS was never the problem:
--     service_role already bypasses RLS by role attribute; it simply
--     never had the underlying table grant to read these tables at all.
--
--     This grants only SELECT, only to service_role, only on the four
--     knowledge tables the AI's read-only tools query. It does not touch
--     RLS, policies, other tables, or any other role -- conversations and
--     messages show the same missing-grant gap but are intentionally left
--     untouched here (out of scope for this fix; see Step 1F report).
-- =========================================================
grant select on public.services to service_role;
grant select on public.service_addons to service_role;
grant select on public.faqs to service_role;
grant select on public.settings to service_role;
