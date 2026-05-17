import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import {
  signUpWithEmail,
  signInWithEmail,
  checkSupabaseConnection,
  checkProfilesTableExists,
} from "../../../../supabaseHelpers";

type AuthMode = "login" | "register";

export default function AuthScreen({ onAuthSuccess, setUser }: any) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>("");

  // Simple validation
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Debug function
  const runDebugCheck = async () => {
    setDebugInfo("Checking setup...");
    try {
      const connResult = await checkSupabaseConnection();
      console.log("Connection check:", connResult);

      const tableResult = await checkProfilesTableExists();
      console.log("Table check:", tableResult);

      let debugMessage = "";
      debugMessage += connResult.success
        ? "✅ Supabase connected\n"
        : `❌ Supabase connection failed: ${connResult.error}\n`;

      debugMessage += tableResult.exists
        ? "✅ Profiles table exists\n"
        : `❌ Profiles table issue: ${tableResult.error}\n`;

      debugMessage += "\n📋 If shows ❌ on table, run the SQL from SUPABASE_SETUP.md";

      setDebugInfo(debugMessage);
      Alert.alert("Debug Info", debugMessage);
    } catch (error: any) {
      const errorMsg = error.message || "Debug check failed";
      setDebugInfo(errorMsg);
      Alert.alert("Debug Error", errorMsg);
    }
  };

  // Handle Login
  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert("Error", "Please enter a valid email");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const result = await signInWithEmail(email, password);

      if (result?.success && result?.user) {
        setUser(result.user);
        onAuthSuccess();
      } else {
        Alert.alert("Login Failed", result?.error || "Invalid credentials");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Register
  const handleRegister = async () => {
    if (!email.trim() || !username.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert("Error", "Please enter a valid email");
      return;
    }

    if (username.length < 3) {
      Alert.alert("Error", "Username must be at least 3 characters");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      console.log("📝 Starting registration with:", { email, username });
      const result = await signUpWithEmail(email, password, username);
      console.log("📝 Registration result:", result);

      if (result?.success && result?.user) {
        console.log("✅ Registration success!");
        setUser(result.user);
        onAuthSuccess();
        Alert.alert("Success", `Welcome ${username}!`);
      } else {
        console.log("❌ Registration failed:", result?.error);
        Alert.alert(
          "Registration Failed",
          result?.error || "Could not create account. Please try again."
        );
      }
    } catch (error: any) {
      console.error("❌ Catch error:", error);
      Alert.alert(
        "Error",
        error.message || "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSwitch = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setUsername("");
    setMode(mode === "login" ? "register" : "login");
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* HEADER */}
          <View style={styles.headerSection}>
            <Text style={styles.logo}>✓ TaskHub</Text>
            <Text style={styles.tagline}>
              {mode === "login" ? "Welcome Back" : "Create Account"}
            </Text>
            <Text style={styles.subtitle}>
              {mode === "login"
                ? "Sign in to manage your tasks"
                : "Join us and stay organized"}
            </Text>
          </View>

          {/* FORM SECTION */}
          <View style={styles.formSection}>
            {/* EMAIL INPUT */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>✉</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#8E92A0"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  editable={!loading}
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* USERNAME INPUT (Register only) */}
            {mode === "register" && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Username</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputIcon}>👤</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Choose a username"
                    placeholderTextColor="#8E92A0"
                    value={username}
                    onChangeText={setUsername}
                    editable={!loading}
                    autoCapitalize="none"
                  />
                </View>
              </View>
            )}

            {/* PASSWORD INPUT */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>🔐</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#8E92A0"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Text>{showPassword ? "👁" : "👁‍🗨"}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* CONFIRM PASSWORD INPUT (Register only) */}
            {mode === "register" && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputIcon}>🔐</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm your password"
                    placeholderTextColor="#8E92A0"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                    editable={!loading}
                    autoCapitalize="none"
                  />
                </View>
              </View>
            )}

            {/* SUBMIT BUTTON */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={mode === "login" ? handleLogin : handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.submitButtonText}>
                {loading ? "Loading..." : mode === "login" ? "Sign In" : "Create Account"}
              </Text>
            </TouchableOpacity>

            {/* SWITCH MODE */}
            <View style={styles.switchModeContainer}>
              <Text style={styles.switchModeText}>
                {mode === "login" ? "Don't have an account? " : "Already have an account? "}
              </Text>
              <TouchableOpacity onPress={handleSwitch} disabled={loading}>
                <Text style={styles.switchModeLink}>
                  {mode === "login" ? "Sign Up" : "Sign In"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* FEATURES SECTION */}
          <View style={styles.featuresSection}>
            <Text style={styles.featuresTitle}>Why TaskHub?</Text>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>✨</Text>
              <View>
                <Text style={styles.featureTitle}>Organize Tasks</Text>
                <Text style={styles.featureDesc}>
                  Manage all your tasks in one place
                </Text>
              </View>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>⚡</Text>
              <View>
                <Text style={styles.featureTitle}>Set Priorities</Text>
                <Text style={styles.featureDesc}>
                  Focus on what matters most
                </Text>
              </View>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>📊</Text>
              <View>
                <Text style={styles.featureTitle}>Track Progress</Text>
                <Text style={styles.featureDesc}>
                  See your completion rate
                </Text>
              </View>
            </View>
          </View>

          {/* DEBUG SECTION */}
          <TouchableOpacity
            style={styles.debugToggle}
            onPress={() => setShowDebug(!showDebug)}
          >
            <Text style={styles.debugToggleText}>⚙️ Troubleshoot Setup</Text>
          </TouchableOpacity>

          {showDebug && (
            <View style={styles.debugPanel}>
              <Text style={styles.debugTitle}>Setup Checker</Text>
              <TouchableOpacity
                style={styles.debugButton}
                onPress={runDebugCheck}
              >
                <Text style={styles.debugButtonText}>Check Connection & Tables</Text>
              </TouchableOpacity>
              {debugInfo && (
                <Text style={styles.debugOutput}>{debugInfo}</Text>
              )}
              <Text style={styles.debugHint}>
                💡 If tables are missing, follow the SQL setup in SUPABASE_SETUP.md
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0e27",
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },

  headerSection: {
    alignItems: "center",
    marginBottom: 40,
  },

  logo: {
    fontSize: 32,
    fontWeight: "800",
    color: "#4FACFE",
    marginBottom: 12,
  },

  tagline: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 14,
    color: "#8E92A0",
    textAlign: "center",
  },

  formSection: {
    marginBottom: 40,
  },

  inputGroup: {
    marginBottom: 20,
  },

  label: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1f3a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a3050",
    paddingHorizontal: 14,
    height: 52,
  },

  inputIcon: {
    fontSize: 18,
    marginRight: 10,
  },

  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "500",
  },

  eyeIcon: {
    padding: 8,
    marginLeft: 8,
  },

  submitButton: {
    backgroundColor: "#4FACFE",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
    shadowColor: "#4FACFE",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },

  submitButtonDisabled: {
    opacity: 0.6,
  },

  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  switchModeContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },

  switchModeText: {
    color: "#8E92A0",
    fontSize: 14,
    fontWeight: "500",
  },

  switchModeLink: {
    color: "#4FACFE",
    fontSize: 14,
    fontWeight: "700",
  },

  featuresSection: {
    borderTopWidth: 1,
    borderTopColor: "#2a3050",
    paddingTop: 32,
  },

  featuresTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
  },

  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#1a1f3a",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2a3050",
  },

  featureIcon: {
    fontSize: 24,
    marginRight: 12,
  },

  featureTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },

  featureDesc: {
    color: "#8E92A0",
    fontSize: 12,
    fontWeight: "500",
  },

  debugToggle: {
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#2a3050",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#3a4060",
    alignItems: "center",
  },

  debugToggleText: {
    color: "#8E92A0",
    fontSize: 12,
    fontWeight: "600",
  },

  debugPanel: {
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "rgba(255, 107, 107, 0.05)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 107, 0.2)",
  },

  debugTitle: {
    color: "#FF6B6B",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 10,
  },

  debugButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(255, 107, 107, 0.2)",
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },

  debugButtonText: {
    color: "#FF6B6B",
    fontSize: 12,
    fontWeight: "600",
  },

  debugOutput: {
    color: "#8E92A0",
    fontSize: 11,
    fontFamily: "monospace",
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#1a1f3a",
    borderRadius: 6,
  },

  debugHint: {
    color: "#FFD93D",
    fontSize: 11,
    fontWeight: "500",
  },
});

