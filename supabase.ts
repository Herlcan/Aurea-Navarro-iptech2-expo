import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://kfjadtmfvoxsbqapqorx.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmamFkdG1mdm94c2JxYXBxb3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NTQ2MTgsImV4cCI6MjA5NDUzMDYxOH0.ttHnEYkKJ87L_s5XwXsw6OM6fPADab91rKgI9lYvHJg";

export const supabase = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
        auth: {
            storage: AsyncStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
        },
    }
);
