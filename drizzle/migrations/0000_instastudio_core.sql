CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)));
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  brief text NOT NULL DEFAULT '',
  niche text NOT NULL DEFAULT '',
  product text NOT NULL DEFAULT '',
  objective text NOT NULL DEFAULT 'vender',
  audience text NOT NULL DEFAULT '',
  tone text NOT NULL DEFAULT '',
  language text NOT NULL DEFAULT 'pt-BR',
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  cta_link text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX projects_owner_idx ON public.projects(owner_id, updated_at DESC);
CREATE TRIGGER projects_touch BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own projects" ON public.projects FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE OR REPLACE FUNCTION public.owns_project(_project_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.projects WHERE id = _project_id AND owner_id = auth.uid())
$$;

CREATE TABLE public.brand_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  handle text NOT NULL DEFAULT '',
  slogan text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  cta text NOT NULL DEFAULT '',
  palette jsonb NOT NULL DEFAULT '["#6D28D9","#DB2777","#F8FAFC","#0F172A"]'::jsonb,
  heading_font text NOT NULL DEFAULT 'Space Grotesk',
  body_font text NOT NULL DEFAULT 'Inter',
  voice text NOT NULL DEFAULT '',
  brand_values text NOT NULL DEFAULT '',
  logo_asset_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER brand_kits_touch BEFORE UPDATE ON public.brand_kits FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.name_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('name','bio')),
  category text,
  value text NOT NULL,
  handle text,
  source text NOT NULL DEFAULT 'ai' CHECK (source IN ('ai','manual')),
  favorite boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX name_suggestions_project_idx ON public.name_suggestions(project_id, kind);

CREATE TABLE public.content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('post','carousel','reel','story')),
  title text NOT NULL DEFAULT '',
  caption text NOT NULL DEFAULT '',
  hashtags text NOT NULL DEFAULT '',
  script text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','approved','scheduled','published')),
  feed_position integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX content_items_project_idx ON public.content_items(project_id, type);
CREATE TRIGGER content_items_touch BEFORE UPDATE ON public.content_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.content_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  heading text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX content_slides_content_idx ON public.content_slides(content_id, position);

CREATE TABLE public.highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  icon text NOT NULL DEFAULT 'star',
  script text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX highlights_project_idx ON public.highlights(project_id, position);

CREATE TABLE public.calendar_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  content_id uuid REFERENCES public.content_items(id) ON DELETE SET NULL,
  title text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','ready','published_manually','skipped')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX calendar_entries_project_idx ON public.calendar_entries(project_id, scheduled_at);
CREATE TRIGGER calendar_entries_touch BEFORE UPDATE ON public.calendar_entries FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  kind text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','succeeded','failed','blocked')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX generation_jobs_project_idx ON public.generation_jobs(project_id, created_at DESC);

CREATE TABLE public.design_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  content_id uuid REFERENCES public.content_items(id) ON DELETE CASCADE,
  width integer NOT NULL DEFAULT 1080,
  height integer NOT NULL DEFAULT 1350,
  layers jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX design_documents_project_idx ON public.design_documents(project_id);

CREATE TABLE public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'image',
  storage_path text NOT NULL,
  label text NOT NULL DEFAULT '',
  approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX media_assets_project_idx ON public.media_assets(project_id);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['brand_kits','name_suggestions','content_items','content_slides','highlights','calendar_entries','generation_jobs','design_documents','media_assets'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "owner access" ON public.%I FOR ALL TO authenticated USING (public.owns_project(project_id)) WITH CHECK (public.owns_project(project_id))', t);
  END LOOP;
END $$;