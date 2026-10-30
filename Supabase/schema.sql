-- Love for Hope Supabase schema
-- Run in Supabase SQL Editor. The application bucket is PRIVATE.
create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'reviewer' check (role in ('super_admin','reviewer','finance')),
  created_at timestamptz not null default now()
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  student_name text not null,
  date_of_birth date not null,
  age integer not null check (age between 9 and 18),
  gender text not null,
  county text not null,
  subcounty text not null,
  residential_address text not null,
  school_name text not null,
  school_location text not null,
  grade text not null,
  academic_performance text not null,
  financial_circumstances text not null,
  guardian_name text not null,
  guardian_relationship text not null,
  guardian_national_id_encrypted text not null,
  guardian_phone text not null,
  alternative_phone text,
  guardian_email text not null,
  guardian_address text not null,
  guardian_consent boolean not null default false check (guardian_consent),
  status text not null default 'Documents Received'
    check (status in ('Pending','Documents Received','Under Verification','Approved','Rejected','Home Assessment','Scholarship Awarded')),
  payment_status text not null default 'Unpaid' check (payment_status in ('Unpaid','Pending Verification','Paid','Refunded')),
  payment_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  document_type text not null,
  file_name text not null,
  mime_type text not null,
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.scholarships (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete restrict,
  school_year text,
  home_assessment_findings text,
  scholarship_amount_kes numeric(12,2) not null default 0,
  academic_progress text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scholarship_payments (
  id uuid primary key default gen_random_uuid(),
  scholarship_id uuid not null references public.scholarships(id) on delete cascade,
  amount_kes numeric(12,2) not null check (amount_kes >= 0),
  paid_on date,
  payment_reference text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  enquiry_type text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create or replace function public.is_lfh_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.admin_users where user_id=auth.uid()) $$;

alter table public.admin_users enable row level security;
alter table public.applications enable row level security;
alter table public.application_documents enable row level security;
alter table public.scholarships enable row level security;
alter table public.scholarship_payments enable row level security;
alter table public.enquiries enable row level security;

create policy "admins can view own admin row" on public.admin_users for select to authenticated using (user_id=auth.uid());
create policy "admins can read applications" on public.applications for select to authenticated using (public.is_lfh_admin());
create policy "admins can update applications" on public.applications for update to authenticated using (public.is_lfh_admin()) with check (public.is_lfh_admin());
create policy "admins can read documents" on public.application_documents for select to authenticated using (public.is_lfh_admin());
create policy "admins can read scholarships" on public.scholarships for select to authenticated using (public.is_lfh_admin());
create policy "admins can manage scholarships" on public.scholarships for all to authenticated using (public.is_lfh_admin()) with check (public.is_lfh_admin());
create policy "admins can read scholarship payments" on public.scholarship_payments for select to authenticated using (public.is_lfh_admin());
create policy "admins can manage scholarship payments" on public.scholarship_payments for all to authenticated using (public.is_lfh_admin()) with check (public.is_lfh_admin());
create policy "admins can read enquiries" on public.enquiries for select to authenticated using (public.is_lfh_admin());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('application-documents','application-documents',false,2097152,array['application/pdf','image/jpeg','image/png'])
on conflict(id) do update set public=false,file_size_limit=2097152,allowed_mime_types=array['application/pdf','image/jpeg','image/png'];

create policy "admins can read private application files" on storage.objects for select to authenticated
using (bucket_id='application-documents' and public.is_lfh_admin());

-- There are intentionally no anon/authenticated insert policies on applications/documents.
-- Public submissions are written only by the submit-application Edge Function using the service role.
-- Never expose the Supabase service-role key in website files.
