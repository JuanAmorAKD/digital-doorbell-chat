
-- Remove existing policy for buildings
DROP POLICY IF EXISTS "Admins can manage buildings" ON public.buildings;
DROP POLICY IF EXISTS "Users can view buildings" ON public.buildings;

-- Create more permissive policies
CREATE POLICY "Any authenticated user can insert buildings" ON public.buildings 
  FOR INSERT TO authenticated USING (true);
  
CREATE POLICY "Any authenticated user can update buildings" ON public.buildings 
  FOR UPDATE TO authenticated USING (true);
  
CREATE POLICY "Any authenticated user can view buildings" ON public.buildings 
  FOR SELECT TO authenticated USING (true);
