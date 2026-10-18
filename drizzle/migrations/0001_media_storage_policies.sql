CREATE OR REPLACE FUNCTION public.owns_project_path(_name text) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE pid uuid;
BEGIN
  BEGIN pid := split_part(_name, '/', 1)::uuid; EXCEPTION WHEN others THEN RETURN false; END;
  RETURN EXISTS (SELECT 1 FROM public.projects WHERE id = pid AND owner_id = auth.uid());
END $$;
CREATE POLICY "media owner read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'media' AND public.owns_project_path(name));
CREATE POLICY "media owner insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media' AND public.owns_project_path(name));
CREATE POLICY "media owner update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'media' AND public.owns_project_path(name));
CREATE POLICY "media owner delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'media' AND public.owns_project_path(name));