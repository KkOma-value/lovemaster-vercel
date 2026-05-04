create table if not exists users (
  id varchar(36) primary key,
  name varchar(100) not null,
  email varchar(255) not null unique,
  password_hash varchar(255),
  google_id varchar(255) unique,
  auth_provider varchar(20) not null default 'local',
  needs_password boolean not null default false,
  avatar_url varchar(500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists refresh_tokens (
  id varchar(36) primary key,
  user_id varchar(36) not null references users(id) on delete cascade,
  token varchar(500) not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists conversations (
  id varchar(36) primary key,
  user_id varchar(36) not null references users(id) on delete cascade,
  chat_type varchar(20) not null default 'loveapp',
  title varchar(255) not null default '新的对话',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_conversations_user_type_updated
  on conversations(user_id, chat_type, updated_at desc);

create table if not exists messages (
  id varchar(36) primary key,
  conversation_id varchar(36) not null references conversations(id) on delete cascade,
  role varchar(20) not null,
  content text not null,
  image_url varchar(500),
  probability_json text,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_conversation_created
  on messages(conversation_id, created_at asc);

create table if not exists conversation_images (
  id varchar(36) primary key,
  conversation_id varchar(36) not null references conversations(id) on delete cascade,
  file_name varchar(255) not null,
  file_type varchar(100) not null,
  public_url varchar(500),
  source_url varchar(500),
  storage_path varchar(500),
  created_at timestamptz not null default now()
);

create index if not exists idx_conversation_images_conversation_created
  on conversation_images(conversation_id, created_at asc);

create table if not exists chat_runs (
  id varchar(36) primary key,
  user_id varchar(36) not null references users(id) on delete cascade,
  chat_id varchar(36) not null,
  chat_type varchar(20) not null,
  status varchar(20) not null default 'QUEUED',
  request_message text,
  image_url varchar(500),
  last_event_type varchar(50),
  latest_status_text text,
  partial_response text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create index if not exists idx_chat_runs_user_status_created
  on chat_runs(user_id, status, created_at desc);

create table if not exists chat_run_events (
  id varchar(36) primary key,
  run_id varchar(36) not null references chat_runs(id) on delete cascade,
  event_type varchar(50) not null,
  content text,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_run_events_run_created
  on chat_run_events(run_id, created_at asc);

create table if not exists wiki_candidates (
  id varchar(36) primary key,
  user_id varchar(36),
  source_chat_id varchar(36),
  source_run_id varchar(36),
  raw_question text,
  raw_answer text,
  abstract_summary text,
  trigger_type varchar(50),
  trigger_score double precision not null default 1.0,
  status varchar(30) not null default 'pending_review',
  stage varchar(100),
  intent varchar(100),
  problem varchar(255),
  reviewer_id varchar(36),
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_wiki_candidates_status_created
  on wiki_candidates(status, created_at desc);

create table if not exists wiki_feedback_events (
  id varchar(36) primary key,
  user_id varchar(36),
  candidate_id varchar(36),
  chat_id varchar(36),
  run_id varchar(36),
  event_type varchar(50),
  event_value text,
  event_score double precision not null default 1.0,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_wiki_feedback_events_candidate
  on wiki_feedback_events(candidate_id);

create table if not exists wiki_strategy_scores (
  id varchar(36) primary key,
  topic_key varchar(255),
  strategy_id varchar(255),
  sample_count integer not null default 0,
  positive_rate double precision not null default 0,
  continue_rate double precision not null default 0,
  confidence double precision not null default 0,
  rank_score double precision not null default 0,
  gray_enabled boolean not null default false,
  computed_at timestamptz not null default now()
);

create index if not exists idx_wiki_strategy_scores_topic_rank
  on wiki_strategy_scores(topic_key, rank_score desc);
