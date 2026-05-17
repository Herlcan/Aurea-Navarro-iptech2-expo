import { supabase } from "./supabase";

// ==================== DEBUG HELPERS ====================

export const checkSupabaseConnection = async () => {
  try {
    console.log("🔍 Checking Supabase connection...");
    const { data, error } = await supabase.from("profiles").select("count");
    
    if (error) {
      console.error("❌ Supabase connection error:", error);
      return { success: false, error: error.message };
    }
    
    console.log("✅ Supabase connection OK");
    return { success: true };
  } catch (error: any) {
    console.error("❌ Connection check failed:", error);
    return { success: false, error: error.message };
  }
};

export const checkProfilesTableExists = async () => {
  try {
    console.log("🔍 Checking if profiles table exists...");
    const { data, error } = await supabase.from("profiles").select("*").limit(1);
    
    if (error?.code === "PGRST116") {
      console.error("❌ Profiles table does NOT exist");
      return { exists: false, error: "Table 'profiles' does not exist in Supabase" };
    }
    
    if (error) {
      console.error("❌ Error checking table:", error);
      return { exists: false, error: error.message };
    }
    
    console.log("✅ Profiles table EXISTS");
    return { exists: true };
  } catch (error: any) {
    console.error("❌ Table check failed:", error);
    return { exists: false, error: error.message };
  }
};

// ==================== AUTH HELPERS ====================

export const signUpWithEmail = async (email: string, password: string, username: string) => {
  try {
    console.log("🔄 Starting signup for email:", email);

    // Sign up user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    console.log("Auth signup error:", signUpError);
    console.log("Auth data:", authData);

    if (signUpError) {
      console.error("❌ Auth signup error:", signUpError);
      throw signUpError;
    }

    if (!authData.user) {
      console.error("❌ No user returned from auth signup");
      throw new Error("No user created from authentication");
    }

    console.log("✅ User created in auth with ID:", authData.user.id);

    // Store user profile in custom profiles table
    const profileData = {
      id: authData.user.id,
      email: authData.user.email,
      username,
      created_at: new Date().toISOString(),
    };

    console.log("🔄 Inserting profile:", profileData);

    const { data: insertData, error: insertError } = await supabase
      .from("profiles")
      .insert([profileData])
      .select();

    console.log("Profile insert error:", insertError);
    console.log("Profile insert data:", insertData);

    if (insertError) {
      console.error("❌ Profile insert error:", insertError);
      throw insertError;
    }

    console.log("✅ Profile created successfully");

    return {
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        username,
        createdAt: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    console.error("❌ Signup error:", error);
    return {
      success: false,
      error: error.message || "Sign up failed",
    };
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  try {
    console.log("🔄 Starting signin for email:", email);

    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log("Auth signin error:", signInError);
    console.log("Auth data:", authData);

    if (signInError) {
      console.error("❌ Auth signin error:", signInError);
      throw signInError;
    }

    if (!authData.user) {
      console.error("❌ No user returned from auth signin");
      throw new Error("No user found for this email/password");
    }

    console.log("✅ User authenticated with ID:", authData.user.id);

    // Fetch user profile
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    console.log("Profile fetch error:", profileError);
    console.log("Profile data:", profileData);

    if (profileError) {
      console.error("❌ Profile fetch error:", profileError);
      throw profileError;
    }

    console.log("✅ Profile fetched successfully");

    return {
      success: true,
      user: {
        id: authData.user.id,
        email: profileData.email,
        username: profileData.username,
        createdAt: profileData.created_at,
      },
    };
  } catch (error: any) {
    console.error("❌ Signin error:", error);
    return {
      success: false,
      error: error.message || "Sign in failed",
    };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Sign out failed",
    };
  }
};

export const getCurrentUser = async () => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session?.user) {
      return { success: false, user: null };
    }

    const { data: profileData, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", sessionData.session.user.id)
      .single();

    if (error) return { success: false, user: null };

    return {
      success: true,
      user: {
        id: sessionData.session.user.id,
        email: profileData.email,
        username: profileData.username,
        createdAt: profileData.created_at,
      },
    };
  } catch (error) {
    return { success: false, user: null };
  }
};

// ==================== TASK HELPERS ====================

export const createTask = async (userId: string, taskData: any) => {
  try {
    const { data, error } = await supabase.from("tasks").insert([
      {
        user_id: userId,
        title: taskData.title,
        done: false,
        priority: taskData.priority,
        description: taskData.description || "",
        due_date: taskData.dueDate || null,
        created_at: new Date().toISOString(),
      },
    ]).select();

    if (error) throw error;

    return {
      success: true,
      task: {
        id: data[0].id,
        title: data[0].title,
        done: data[0].done,
        priority: data[0].priority,
        description: data[0].description,
        dueDate: data[0].due_date,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to create task",
    };
  }
};

export const getTasks = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return {
      success: true,
      tasks: data.map((task: any) => ({
        id: task.id,
        title: task.title,
        done: task.done,
        priority: task.priority,
        description: task.description,
        dueDate: task.due_date,
      })),
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to fetch tasks",
      tasks: [],
    };
  }
};

export const updateTask = async (taskId: string, updates: any) => {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .update({
        title: updates.title,
        done: updates.done,
        priority: updates.priority,
        description: updates.description,
        due_date: updates.dueDate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)
      .select();

    if (error) throw error;

    return {
      success: true,
      task: {
        id: data[0].id,
        title: data[0].title,
        done: data[0].done,
        priority: data[0].priority,
        description: data[0].description,
        dueDate: data[0].due_date,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to update task",
    };
  }
};

export const deleteTask = async (taskId: string) => {
  try {
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to delete task",
    };
  }
};

export const toggleTask = async (taskId: string, currentStatus: boolean) => {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .update({
        done: !currentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)
      .select();

    if (error) throw error;

    return {
      success: true,
      task: {
        id: data[0].id,
        done: data[0].done,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to toggle task",
    };
  }
};
