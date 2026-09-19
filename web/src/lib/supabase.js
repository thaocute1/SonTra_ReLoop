import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://aomluycgyplpmsspwixp.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvbWx1eWNneXBscG1zc3B3aXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyNDQ4MTAsImV4cCI6MjA1NjgyMDgxMH0.O-5Y148gX4yB03U65U6o-r1aN8eJ32YmH2Z6'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
