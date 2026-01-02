-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users Table (extends Supabase Auth)
create table public.users (
  id uuid references auth.users not null primary key,
  email text unique not null,
  name text,
  role text default 'Viewer', -- 'Admin', 'Editor', 'Viewer'
  status text default 'Pending', -- 'Active', 'Pending', 'Suspended'
  avatar text,
  department text,
  last_login timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for Users
alter table public.users enable row level security;
create policy "Public profiles are viewable by everyone" on public.users for select using (true);
create policy "Users can insert their own profile" on public.users for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);

-- Categories Table
create table public.categories (
  id uuid default uuid_generate_v4() primary key,
  name text unique not null,
  created_at timestamptz default now()
);

-- Projects Table
create table public.projects (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  category text,
  status text default 'Active',
  participants jsonb default '[]'::jsonb, -- Array of user IDs or objects
  due_date timestamptz,
  start_date timestamptz default now(),
  completed_date timestamptz,
  created_by uuid references public.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Documents Table
create table public.documents (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  category text, 
  status text default 'Uploaded',
  
  -- File Details
  file_url text,
  file_path text,
  file_name text,
  file_original_name text,
  file_mimetype text,
  file_size bigint,
  
  thumbnail text,
  version integer default 1,
  
  uploaded_by uuid references public.users(id),
  current_approver uuid references public.users(id),
  approval_stage text default 'Manager Review',
  project_id uuid references public.projects(id),
  
  tags text[],
  virus_scan_status text default 'Passed',
  metadata jsonb default '{}'::jsonb,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Audit Logs Table
create table public.audit_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id),
  action text not null,
  action_type text default 'info',
  details text,
  ip_address text,
  user_agent text,
  automated boolean default false,
  metadata jsonb default '{}'::jsonb,
  
  document_id uuid references public.documents(id),
  document_title text,
  project_id uuid references public.projects(id),
  
  created_at timestamptz default now()
);

-- Workflows Table (matching ApprovalWorkflowService)
create table public.approval_workflows (
  id uuid default uuid_generate_v4() primary key,
  document_id uuid references public.documents(id) on delete cascade unique,
  stages jsonb not null, -- Array of stage objects
  current_stage_index integer default 0,
  overall_status text default 'In Progress',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- System Settings Table
create table if not exists public.system_settings (
  id text primary key,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- Basic RLS for System Settings (usually manageable by admin, but readable by all)
alter table public.system_settings enable row level security;
create policy "Anyone can read system settings" on public.system_settings for select using (true);
create policy "Only authenticated users can update system settings" on public.system_settings for update using (auth.role() = 'authenticated');
