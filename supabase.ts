import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://adhgkdcaqmjqhmallmds.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkaGdrZGNhcW1qcWhtYWxsbWRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMzMwMjIsImV4cCI6MjA5MzgwOTAyMn0.Jhj98-4t_yL3t03CNpRHLplGoDhZ1WTDVNIiS9eO4r4";

export const supabase = createClient(
    supabaseUrl,
    supabaseAnonKey
);