// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://wqoqouqakhndmjyhktew.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indxb3FvdXFha2huZG1qeWhrdGV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIxMDA0MzgsImV4cCI6MjA1NzY3NjQzOH0.KS9g6fiiUiDY_fkRngGcnyzTT0WBvAqgfjn7mmqPVgk";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);