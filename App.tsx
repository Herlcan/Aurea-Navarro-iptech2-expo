import React, { useMemo, useState, useEffect } from "react";
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  FlatList,
  Modal,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import AuthScreen from "./src/screens/src/components/AuthScreen";
import {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  toggleTask,
  signOut,
} from "./supabaseHelpers";

type Priority = "low" | "medium" | "high";

type Task = {
  id: string;
  title: string;
  done: boolean;
  priority: Priority;
  dueDate?: string;
  description?: string;
};

type FilterType = "all" | "active" | "completed";

type User = {
  id: string;
  email: string;
  username: string;
  createdAt: string;
};

export default function App() {
  // AUTHENTICATION STATE
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // TASK STATE
  const [text, setText] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editPriority, setEditPriority] = useState<Priority>("medium");
  const [selectedPriority, setSelectedPriority] = useState<Priority>("medium");
  const [showModal, setShowModal] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // LOAD TASKS FROM SUPABASE
  useEffect(() => {
    if (isLoggedIn && user) {
      loadTasksFromSupabase();
    }
  }, [isLoggedIn, user]);

  const loadTasksFromSupabase = async () => {
    if (!user) return;
    setLoadingTasks(true);
    try {
      const result = await getTasks(user.id);
      if (result.success) {
        setTasks(result.tasks);
      } else {
        Alert.alert("Error", "Failed to load tasks");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoadingTasks(false);
    }
  };

  // FILTERED TASKS
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (filter === "active") return !task.done;
      if (filter === "completed") return task.done;
      return true;
    });
  }, [tasks, filter]);

  // SORT TASKS BY PRIORITY
  const sortedTasks = useMemo(() => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return [...filteredTasks].sort((a, b) => {
      if (a.done === b.done) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.done ? 1 : -1;
    });
  }, [filteredTasks]);

  // ADD TASK
  const addTask = async () => {
    if (!text.trim()) {
      Alert.alert("Error", "Please enter a task");
      return;
    }

    if (!user) {
      Alert.alert("Error", "User not logged in");
      return;
    }

    setSyncing(true);
    try {
      const result = await createTask(user.id, {
        title: text,
        priority: selectedPriority,
        description: "",
      });

      if (result.success && result.task) {
        setTasks([result.task, ...tasks]);
        setText("");
        setSelectedPriority("medium");
        setShowModal(false);
      } else {
        Alert.alert("Error", result.error || "Failed to create task");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setSyncing(false);
    }
  };

  // TOGGLE TASK STATUS
  const toggleTaskStatus = async (id: string) => {
    if (!user) return;

    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    setSyncing(true);
    try {
      const result = await toggleTask(id, task.done);

      if (result.success) {
        setTasks(
          tasks.map((t) =>
            t.id === id ? { ...t, done: !t.done } : t
          )
        );
      } else {
        Alert.alert("Error", result.error || "Failed to update task");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setSyncing(false);
    }
  };

  // DELETE TASK
  const deleteTaskFromDb = async (id: string) => {
    if (!user) return;

    Alert.alert("Delete Task", "Are you sure you want to delete this task?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setSyncing(true);
          try {
            const result = await deleteTask(id);

            if (result.success) {
              setTasks(tasks.filter((task) => task.id !== id));
            } else {
              Alert.alert("Error", result.error || "Failed to delete task");
            }
          } catch (error: any) {
            Alert.alert("Error", error.message);
          } finally {
            setSyncing(false);
          }
        },
      },
    ]);
  };

  // EDIT TASK
  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setEditText(task.title);
    setEditPriority(task.priority);
  };

  const saveEdit = async () => {
    if (!editText.trim()) {
      Alert.alert("Error", "Task title cannot be empty");
      return;
    }

    if (!user) return;

    setSyncing(true);
    try {
      const result = await updateTask(editingId!, {
        title: editText,
        priority: editPriority,
        description: "",
      });

      if (result.success && result.task) {
        setTasks(
          tasks.map((task) =>
            task.id === editingId
              ? { ...task, title: editText, priority: editPriority }
              : task
          )
        );
        setEditingId(null);
        setEditText("");
      } else {
        Alert.alert("Error", result.error || "Failed to update task");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setSyncing(false);
    }
  };

  // COMPLETED COUNT
  const totalDone = useMemo(
    () => tasks.filter((task) => task.done).length,
    [tasks]
  );

  const completionPercentage = tasks.length > 0 ? (totalDone / tasks.length) * 100 : 0;

  // LOGOUT HANDLER
  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          setSyncing(true);
          try {
            const result = await signOut();

            if (result.success) {
              setIsLoggedIn(false);
              setUser(null);
              setTasks([]);
              setText("");
            } else {
              Alert.alert("Error", result.error || "Logout failed");
            }
          } catch (error: any) {
            Alert.alert("Error", error.message);
          } finally {
            setSyncing(false);
          }
        },
      },
    ]);
  };

  // SHOW AUTH SCREEN IF NOT LOGGED IN
  if (!isLoggedIn) {
    return (
      <AuthScreen
        onAuthSuccess={() => setIsLoggedIn(true)}
        setUser={setUser}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0e27" />

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Tasks</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
          disabled={syncing}
        >
          <Text style={styles.logoutText}>{syncing ? "..." : "↪ Logout"}</Text>
        </TouchableOpacity>
      </View>

      {/* LOADING INDICATOR */}
      {loadingTasks && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4FACFE" />
          <Text style={styles.loadingText}>Loading tasks...</Text>
        </View>
      )}

      {/* PROGRESS BAR */}
      {tasks.length > 0 && (
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${completionPercentage}%` }]}
            />
          </View>
          <Text style={styles.progressText}>{Math.round(completionPercentage)}% complete</Text>
        </View>
      )}

      {/* FILTER BUTTONS */}
      <View style={styles.filterSection}>
        <TouchableOpacity
          style={[styles.filterButton, filter === "all" && styles.filterActive]}
          onPress={() => setFilter("all")}
        >
          <Text
            style={[
              styles.filterText,
              filter === "all" && styles.filterActiveText,
            ]}
          >
            All ({tasks.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, filter === "active" && styles.filterActive]}
          onPress={() => setFilter("active")}
        >
          <Text
            style={[
              styles.filterText,
              filter === "active" && styles.filterActiveText,
            ]}
          >
            Active ({tasks.filter((t) => !t.done).length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, filter === "completed" && styles.filterActive]}
          onPress={() => setFilter("completed")}
        >
          <Text
            style={[
              styles.filterText,
              filter === "completed" && styles.filterActiveText,
            ]}
          >
            Done ({totalDone})
          </Text>
        </TouchableOpacity>
      </View>

      {/* INPUT */}
      <View style={styles.inputWrapper}>
        <TextInput
          placeholder="Add a new task..."
          placeholderTextColor="#7C7C80"
          value={text}
          onChangeText={setText}
          style={styles.input}
          onSubmitEditing={() => {
            if (text.trim()) addTask();
          }}
        />

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowModal(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.addText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* TASK LIST */}
      <FlatList
        data={sortedTasks}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 40,
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyTitle}>
              {filter === "completed"
                ? "No completed tasks yet"
                : filter === "active"
                ? "No active tasks"
                : "No tasks yet"}
            </Text>

            <Text style={styles.emptySubtitle}>
              {filter === "completed"
                ? "Complete a task to see it here."
                : filter === "active"
                ? "All tasks are complete! Great job!"
                : "Add something important to do."}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.taskCard}>
            {/* PRIORITY INDICATOR */}
            <View
              style={[
                styles.priorityDot,
                item.priority === "high"
                  ? styles.priorityHigh
                  : item.priority === "medium"
                  ? styles.priorityMedium
                  : styles.priorityLow,
              ]}
            />

            {/* LEFT SIDE */}
            {editingId === item.id ? (
              <View style={styles.editMode}>
                <TextInput
                  value={editText}
                  onChangeText={setEditText}
                  style={styles.editInput}
                  placeholderTextColor="#7C7C80"
                />
                <View style={styles.prioritySelector}>
                  {(["low", "medium", "high"] as Priority[]).map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.priorityOption,
                        editPriority === p && styles.priorityOptionActive,
                      ]}
                      onPress={() => setEditPriority(p)}
                    >
                      <Text style={styles.priorityOptionText}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={saveEdit}
                    disabled={syncing}
                  >
                    <Text style={styles.saveButtonText}>{syncing ? "..." : "Save"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setEditingId(null)}
                    disabled={syncing}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.taskLeft}
                activeOpacity={0.8}
                onPress={() => toggleTaskStatus(item.id)}
              >
                <View
                  style={[
                    styles.circle,
                    item.done && styles.circleDone,
                  ]}
                >
                  {item.done && (
                    <Text style={styles.check}>✓</Text>
                  )}
                </View>

                <View style={styles.taskContent}>
                  <Text
                    style={[
                      styles.taskText,
                      item.done && styles.taskDone,
                    ]}
                  >
                    {item.title}
                  </Text>

                  <View style={styles.taskMeta}>
                    <Text
                      style={[
                        styles.statusText,
                        item.done
                          ? styles.completedStatus
                          : styles.pendingStatus,
                      ]}
                    >
                      {item.done ? "✓ Completed" : "⏳ Pending"}
                    </Text>
                    <Text
                      style={[
                        styles.priorityLabel,
                        item.priority === "high"
                          ? styles.priorityLabelHigh
                          : item.priority === "medium"
                          ? styles.priorityLabelMedium
                          : styles.priorityLabelLow,
                      ]}
                    >
                      {item.priority}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* ACTION BUTTONS */}
            {editingId !== item.id && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  onPress={() => startEdit(item)}
                  style={styles.editButton}
                  disabled={syncing}
                >
                  <Text style={styles.editButtonText}>✎</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => deleteTaskFromDb(item.id)}
                  style={styles.deleteButton}
                  disabled={syncing}
                >
                  <Text style={styles.deleteText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      />

      {/* ADD TASK MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showModal}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Task</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              placeholder="Task title..."
              placeholderTextColor="#7C7C80"
              value={text}
              onChangeText={setText}
              style={styles.modalInput}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.priorityLabel}>Select Priority</Text>
            <View style={styles.prioritySelectorModal}>
              {(["low", "medium", "high"] as Priority[]).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityOptionModal,
                    selectedPriority === p && styles.priorityOptionModalActive,
                  ]}
                  onPress={() => setSelectedPriority(p)}
                >
                  <View
                    style={[
                      styles.priorityDotModal,
                      p === "high"
                        ? styles.priorityHighModal
                        : p === "medium"
                        ? styles.priorityMediumModal
                        : styles.priorityLowModal,
                    ]}
                  />
                  <Text
                    style={[
                      styles.priorityOptionModalText,
                      selectedPriority === p && styles.priorityOptionModalTextActive,
                    ]}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowModal(false);
                  setText("");
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalAddButton}
                onPress={addTask}
              >
                <Text style={styles.modalAddText}>Add Task</Text>
              </TouchableOpacity>
            </View>
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
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    paddingHorizontal: 24,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
  },

  subtitle: {
    color: "#8E92A0",
    fontSize: 13,
    marginTop: 4,
    fontWeight: "500",
  },

  userEmail: {
    color: "#8E92A0",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "500",
  },

  logoutButton: {
    backgroundColor: "rgba(255, 107, 107, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 107, 0.3)",
  },

  logoutText: {
    color: "#FF6B6B",
    fontSize: 12,
    fontWeight: "700",
  },

  loadingContainer: {
    alignItems: "center",
    paddingVertical: 24,
    marginBottom: 16,
    backgroundColor: "rgba(79, 172, 254, 0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(79, 172, 254, 0.2)",
  },

  loadingText: {
    color: "#4FACFE",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
  },

  counterBox: {
    backgroundColor: "rgba(79, 172, 254, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(79, 172, 254, 0.3)",
  },

  counterText: {
    color: "#4FACFE",
    fontSize: 14,
    fontWeight: "700",
  },

  progressSection: {
    marginBottom: 24,
    paddingHorizontal: 24,
  },

  progressBar: {
    height: 6,
    backgroundColor: "#1a1f3a",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#4FACFE",
    borderRadius: 3,
  },

  progressText: {
    color: "#8E92A0",
    fontSize: 12,
    fontWeight: "600",
  },

  filterSection: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 8,
    paddingHorizontal: 24,
  },

  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#1a1f3a",
    borderWidth: 1,
    borderColor: "#2a3050",
  },

  filterActive: {
    backgroundColor: "rgba(79, 172, 254, 0.2)",
    borderColor: "#4FACFE",
  },

  filterText: {
    color: "#8E92A0",
    fontSize: 12,
    fontWeight: "600",
  },

  filterActiveText: {
    color: "#4FACFE",
  },

  inputWrapper: {
    flexDirection: "row",
    marginBottom: 24,
    gap: 10,
    paddingHorizontal: 24,
  },

  input: {
    flex: 1,
    backgroundColor: "#1a1f3a",
    color: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#2a3050",
  },

  addButton: {
    backgroundColor: "#4FACFE",
    borderRadius: 14,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#4FACFE",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },

  addText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 24,
  },

  priorityDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginRight: 12,
  },

  priorityHigh: {
    backgroundColor: "#FF6B6B",
  },

  priorityMedium: {
    backgroundColor: "#FFD93D",
  },

  priorityLow: {
    backgroundColor: "#6BCF7F",
  },

  taskCard: {
    backgroundColor: "#1a1f3a",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#2a3050",
  },

  taskLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
  },

  taskContent: {
    flex: 1,
  },

  circle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#3a4060",
    marginRight: 12,
    marginTop: 2,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },

  circleDone: {
    backgroundColor: "#4FACFE",
    borderColor: "#4FACFE",
  },

  check: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  taskText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 6,
  },

  taskDone: {
    textDecorationLine: "line-through",
    color: "#5a6080",
  },

  taskMeta: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },

  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },

  completedStatus: {
    color: "#6BCF7F",
  },

  pendingStatus: {
    color: "#FFD93D",
  },

  priorityLabel: {
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },

  priorityLabelHigh: {
    color: "#FF6B6B",
    backgroundColor: "rgba(255, 107, 107, 0.1)",
  },

  priorityLabelMedium: {
    color: "#FFD93D",
    backgroundColor: "rgba(255, 217, 61, 0.1)",
  },

  priorityLabelLow: {
    color: "#6BCF7F",
    backgroundColor: "rgba(107, 207, 127, 0.1)",
  },

  actionButtons: {
    flexDirection: "row",
    gap: 8,
    marginLeft: 8,
  },

  editButton: {
    backgroundColor: "#2a3050",
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  editButtonText: {
    color: "#4FACFE",
    fontSize: 14,
    fontWeight: "700",
  },

  deleteButton: {
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  deleteText: {
    color: "#FF6B6B",
    fontSize: 16,
    fontWeight: "700",
  },

  editMode: {
    flex: 1,
    gap: 8,
  },

  editInput: {
    backgroundColor: "#2a3050",
    color: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#4FACFE",
  },

  prioritySelector: {
    flexDirection: "row",
    gap: 6,
  },

  priorityOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#2a3050",
    borderWidth: 1,
    borderColor: "#3a4060",
  },

  priorityOptionActive: {
    backgroundColor: "#4FACFE",
    borderColor: "#4FACFE",
  },

  priorityOptionText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },

  editActions: {
    flexDirection: "row",
    gap: 8,
  },

  saveButton: {
    flex: 1,
    backgroundColor: "#4FACFE",
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },

  cancelButton: {
    flex: 1,
    backgroundColor: "#2a3050",
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  cancelButtonText: {
    color: "#8E92A0",
    fontWeight: "700",
    fontSize: 12,
  },

  emptyState: {
    marginTop: 80,
    alignItems: "center",
    paddingHorizontal: 20,
  },

  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },

  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },

  emptySubtitle: {
    color: "#8E92A0",
    fontSize: 14,
    textAlign: "center",
  },

  // MODAL STYLES
  centeredView: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },

  modalView: {
    backgroundColor: "#1a1f3a",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: 400,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  modalTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },

  modalClose: {
    color: "#8E92A0",
    fontSize: 20,
    fontWeight: "700",
  },

  modalInput: {
    backgroundColor: "#2a3050",
    color: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#3a4060",
    maxHeight: 100,
  },

  prioritySelectorModal: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },

  priorityOptionModal: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#2a3050",
    borderWidth: 2,
    borderColor: "#3a4060",
    gap: 8,
  },

  priorityOptionModalActive: {
    backgroundColor: "rgba(79, 172, 254, 0.15)",
    borderColor: "#4FACFE",
  },

  priorityDotModal: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  priorityHighModal: {
    backgroundColor: "#FF6B6B",
  },

  priorityMediumModal: {
    backgroundColor: "#FFD93D",
  },

  priorityLowModal: {
    backgroundColor: "#6BCF7F",
  },

  priorityOptionModalText: {
    color: "#8E92A0",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },

  priorityOptionModalTextActive: {
    color: "#4FACFE",
  },

  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },

  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#2a3050",
    justifyContent: "center",
    alignItems: "center",
  },

  modalCancelText: {
    color: "#8E92A0",
    fontWeight: "700",
    fontSize: 15,
  },

  modalAddButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#4FACFE",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#4FACFE",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },

  modalAddText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
});