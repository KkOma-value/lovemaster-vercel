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

create table if not exists wiki_candidate (
  id varchar(36) primary key,
  source_chat_id varchar(64) not null,
  source_run_id varchar(64),
  user_id varchar(36) not null,
  trigger_type varchar(32) not null,
  trigger_score numeric(4, 3),
  raw_question text,
  raw_answer text not null,
  stage varchar(32) not null,
  intent varchar(32) not null,
  problem varchar(32) not null,
  schema_version varchar(16) not null,
  abstract_summary text,
  status varchar(20) not null default 'pending_review',
  reviewer_id varchar(36),
  rejected_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_wiki_candidate_user_created
  on wiki_candidate(user_id, created_at desc);

create index if not exists idx_wiki_candidate_status_created
  on wiki_candidate(status, created_at desc);

create index if not exists idx_wiki_candidate_topic
  on wiki_candidate(stage, intent, problem);

create table if not exists wiki_feedback_event (
  id varchar(36) primary key,
  candidate_id varchar(36),
  source_chat_id varchar(64) not null,
  source_run_id varchar(64),
  user_id varchar(36) not null,
  event_type varchar(32) not null,
  event_value varchar(64),
  event_score numeric(4, 3),
  meta_json text,
  created_at timestamptz not null default now(),
  processed boolean not null default false,
  processed_at timestamptz
);

create index if not exists idx_wiki_feedback_candidate_created
  on wiki_feedback_event(candidate_id, created_at desc);

create index if not exists idx_wiki_feedback_user_created
  on wiki_feedback_event(user_id, created_at desc);

create table if not exists wiki_strategy_score (
  id varchar(36) primary key,
  topic_key varchar(96) not null,
  strategy_id varchar(64) not null,
  sample_count integer not null default 0,
  positive_rate numeric(5, 4),
  continue_rate numeric(5, 4),
  confidence numeric(5, 4),
  rank_score numeric(6, 4),
  gray_enabled boolean not null default false,
  computed_at timestamptz not null default now(),
  unique (topic_key, strategy_id)
);

create index if not exists idx_wss_topic_rank
  on wiki_strategy_score(topic_key, rank_score desc);
