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
  Modal,
} from "react-native";
import {
  signUpWithEmail,
  signInWithEmail,
  signOut,
  checkSupabaseConnection,
  checkProfilesTableExists,
} from "../../../../supabaseHelpers";

type AuthMode = "login" | "register";
type FeedbackTone = "success" | "error";
type FeedbackDialog = {
  title: string;
  message: string;
  tone: FeedbackTone;
  onClose?: () => void;
};

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
  const [feedbackDialog, setFeedbackDialog] = useState<FeedbackDialog | null>(null);

  const showFeedback = (dialog: FeedbackDialog) => {
    setFeedbackDialog(dialog);
  };

  const closeFeedback = () => {
    const nextAction = feedbackDialog?.onClose;
    setFeedbackDialog(null);
    nextAction?.();
  };

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
      showFeedback({
        title: "Missing Details",
        message: "Please enter your email and password before signing in.",
        tone: "error",
      });
      return;
    }

    if (!validateEmail(email)) {
      showFeedback({
        title: "Invalid Email",
        message: "Please enter a valid email address.",
        tone: "error",
      });
      return;
    }

    if (password.length < 6) {
      showFeedback({
        title: "Invalid Password",
        message: "Password must be at least 6 characters.",
        tone: "error",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await signInWithEmail(email, password);

      if (result?.success && result?.user) {
        setUser(result.user);
        showFeedback({
          title: "Login Successful",
          message: "Your credentials are correct. Welcome back!",
          tone: "success",
          onClose: onAuthSuccess,
        });
      } else {
        showFeedback({
          title: "Login Failed",
          message:
            result?.error ||
            "Incorrect email or password. Please check your credentials and try again.",
          tone: "error",
        });
      }
    } catch (error: any) {
      showFeedback({
        title: "Login Error",
        message: error.message || "Login failed. Please try again.",
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle Register
  const handleRegister = async () => {
    if (!email.trim() || !username.trim() || !password.trim() || !confirmPassword.trim()) {
      showFeedback({
        title: "Missing Details",
        message: "Please fill in every field before creating your account.",
        tone: "error",
      });
      return;
    }

    if (!validateEmail(email)) {
      showFeedback({
        title: "Invalid Email",
        message: "Please enter a valid email address.",
        tone: "error",
      });
      return;
    }

    if (username.length < 3) {
      showFeedback({
        title: "Invalid Username",
        message: "Username must be at least 3 characters.",
        tone: "error",
      });
      return;
    }

    if (password.length < 6) {
      showFeedback({
        title: "Invalid Password",
        message: "Password must be at least 6 characters.",
        tone: "error",
      });
      return;
    }

    if (password !== confirmPassword) {
      showFeedback({
        title: "Password Mismatch",
        message: "Passwords do not match. Please re-enter them.",
        tone: "error",
      });
      return;
    }

    setLoading(true);
    try {
      console.log("📝 Starting registration with:", { email, username });
      const result = await signUpWithEmail(email, password, username);
      console.log("📝 Registration result:", result);

      if (result?.success && result?.user) {
        console.log("✅ Registration success, waiting for email confirmation");
        setUser(null);
        await signOut();
        showFeedback({
          title: "Confirmation Email Sent",
          message:
            `We sent a confirmation email to ${email}. Please verify your email before signing in.`,
          tone: "success",
          onClose: () => {
            setMode("login");
            setPassword("");
            setConfirmPassword("");
            setUsername("");
          },
        });
      } else {
        console.log("❌ Registration failed:", result?.error);
        showFeedback({
          title: "Registration Failed",
          message: result?.error || "Could not create account. Please try again.",
          tone: "error",
        });
      }
    } catch (error: any) {
      console.error("❌ Catch error:", error);
      showFeedback({
        title: "Registration Error",
        message: error.message || "Registration failed. Please try again.",
        tone: "error",
      });
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

      <Modal
        visible={feedbackDialog !== null}
        transparent
        animationType="fade"
        onRequestClose={closeFeedback}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <View
              style={[
                styles.dialogIcon,
                feedbackDialog?.tone === "success"
                  ? styles.dialogIconSuccess
                  : styles.dialogIconError,
              ]}
            >
              <Text style={styles.dialogIconText}>
                {feedbackDialog?.tone === "success" ? "✓" : "!"}
              </Text>
            </View>
            <Text style={styles.dialogTitle}>{feedbackDialog?.title}</Text>
            <Text style={styles.dialogMessage}>{feedbackDialog?.message}</Text>
            <TouchableOpacity
              style={[
                styles.dialogButton,
                feedbackDialog?.tone === "success"
                  ? styles.dialogButtonSuccess
                  : styles.dialogButtonError,
              ]}
              onPress={closeFeedback}
              activeOpacity={0.85}
            >
              <Text style={styles.dialogButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  dialogOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },

  dialogCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#1a1f3a",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a3050",
    paddingHorizontal: 22,
    paddingVertical: 24,
    alignItems: "center",
  },

  dialogIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },

  dialogIconSuccess: {
    backgroundColor: "rgba(79, 172, 254, 0.2)",
    borderWidth: 1,
    borderColor: "#4FACFE",
  },

  dialogIconError: {
    backgroundColor: "rgba(255, 107, 107, 0.18)",
    borderWidth: 1,
    borderColor: "#FF6B6B",
  },

  dialogIconText: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
  },

  dialogTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },

  dialogMessage: {
    color: "#C5CAD8",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 22,
  },

  dialogButton: {
    width: "100%",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },

  dialogButtonSuccess: {
    backgroundColor: "#4FACFE",
  },

  dialogButtonError: {
    backgroundColor: "#FF6B6B",
  },

  dialogButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
