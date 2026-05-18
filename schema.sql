-- Run this in your Supabase SQL Editor (Database → SQL Editor → New query)
-- Cassius OS — full schema with Row Level Security

-- Tasks
create table if not exists tasks (
  id bigint not null,
  user_id uuid references auth.users not null,
  text text not null,
  done boolean default false,
  primary key (user_id, id)
);
alter table tasks enable row level security;
create policy "own_tasks" on tasks for all using (auth.uid() = user_id);

-- Daily checklists
create table if not exists daily_checklists (
  user_id uuid references auth.users not null,
  date text not null,
  checks jsonb not null default '[]',
  primary key (user_id, date)
);
alter table daily_checklists enable row level security;
create policy "own_checklists" on daily_checklists for all using (auth.uid() = user_id);

-- Observations
create table if not exists observations (
  id bigint not null,
  user_id uuid references auth.users not null,
  date text not null,
  tag text not null,
  observation text not null,
  meaning text,
  primary key (user_id, id)
);
alter table observations enable row level security;
create policy "own_observations" on observations for all using (auth.uid() = user_id);

-- Exposure ladder checks
create table if not exists exposure_checks (
  user_id uuid references auth.users not null,
  date text not null,
  checks jsonb not null default '[]',
  primary key (user_id, date)
);
alter table exposure_checks enable row level security;
create policy "own_exposure_checks" on exposure_checks for all using (auth.uid() = user_id);

-- Social interactions
create table if not exists interactions (
  id bigint not null,
  user_id uuid references auth.users not null,
  date text not null,
  level int,
  overexplained boolean,
  posture boolean,
  speech boolean,
  eye_contact boolean,
  notes text,
  primary key (user_id, id)
);
alter table interactions enable row level security;
create policy "own_interactions" on interactions for all using (auth.uid() = user_id);

-- Library — active books
create table if not exists library_active (
  user_id uuid references auth.users not null,
  book_id text not null,
  pages_read int default 0,
  total_pages int default 0,
  primary key (user_id, book_id)
);
alter table library_active enable row level security;
create policy "own_library_active" on library_active for all using (auth.uid() = user_id);

-- Library — notes
create table if not exists library_notes (
  id bigint not null,
  user_id uuid references auth.users not null,
  book_id text not null,
  date text not null,
  type text,
  content text,
  primary key (user_id, id)
);
alter table library_notes enable row level security;
create policy "own_library_notes" on library_notes for all using (auth.uid() = user_id);

-- Flashcard reviews
create table if not exists card_reviews (
  user_id uuid references auth.users not null,
  card_key text not null,
  last_review text,
  next_review text,
  level int default 1,
  primary key (user_id, card_key)
);
alter table card_reviews enable row level security;
create policy "own_card_reviews" on card_reviews for all using (auth.uid() = user_id);

-- Living principles
create table if not exists principles (
  id bigint not null,
  user_id uuid references auth.users not null,
  number int,
  text text,
  context text,
  date text not null,
  primary key (user_id, id)
);
alter table principles enable row level security;
create policy "own_principles" on principles for all using (auth.uid() = user_id);

-- Letters to future self
create table if not exists letters (
  id bigint not null,
  user_id uuid references auth.users not null,
  recipient text,
  date text not null,
  unlock_date text,
  content text,
  notified boolean default false,
  primary key (user_id, id)
);
alter table letters enable row level security;
create policy "own_letters" on letters for all using (auth.uid() = user_id);

-- Night audits
create table if not exists audits (
  user_id uuid references auth.users not null,
  date text not null,
  data jsonb,
  primary key (user_id, date)
);
alter table audits enable row level security;
create policy "own_audits" on audits for all using (auth.uid() = user_id);

-- User state — single row per user for all miscellaneous state
create table if not exists user_state (
  user_id uuid references auth.users primary key,
  virtue jsonb,
  arc jsonb,
  exposure_level int default 1,
  constitution jsonb,
  mirror jsonb,
  mentor_last_open text,
  dismissed_drifts jsonb default '[]',
  drift_log jsonb default '{}',
  api_key text
);
alter table user_state enable row level security;
create policy "own_state" on user_state for all using (auth.uid() = user_id);
