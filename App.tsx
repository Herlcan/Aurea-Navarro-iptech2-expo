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
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import * as Notifications from "expo-notifications";
import AuthScreen from "./src/screens/src/components/AuthScreen";
import {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  toggleTask,
  signOut,
  getCurrentUser,
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

const NOTIFICATION_CHANNEL_ID = "task-reminders";

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

const getTaskNotificationId = (taskId: string) => `task-reminder-${taskId}`;

const parseDueDateInput = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?$/
  );
  if (!match) return null;

  const [, yearValue, monthValue, dayValue, hourValue = "09", minuteValue = "00"] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const hour = Number(hourValue);
  const minute = Number(minuteValue);
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return null;
  }

  return date;
};

const formatDueDateForInput = (dueDate?: string | null) => {
  if (!dueDate) return "";
  const date = new Date(dueDate);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatDueDateForDisplay = (dueDate?: string | null) => {
  if (!dueDate) return "";
  const date = new Date(dueDate);
  if (Number.isNaN(date.getTime())) return "";

  return `Due ${date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`;
};

const isTaskOverdue = (task: Task) => {
  if (!task.dueDate || task.done) return false;
  return new Date(task.dueDate).getTime() < Date.now();
};

const ensureNotificationPermissions = async () => {
  if (Platform.OS === "web") return false;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
      name: "Task reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#4FACFE",
    });
  }

  const currentPermissions = await Notifications.getPermissionsAsync();
  if (currentPermissions.status === "granted") return true;

  const requestedPermissions = await Notifications.requestPermissionsAsync();
  return requestedPermissions.status === "granted";
};

export default function App() {
  // AUTHENTICATION STATE
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // TASK STATE
  const [text, setText] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editPriority, setEditPriority] = useState<Priority>("medium");
  const [editDueDateInput, setEditDueDateInput] = useState("");
  const [selectedPriority, setSelectedPriority] = useState<Priority>("medium");
  const [dueDateInput, setDueDateInput] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const resetTaskForm = () => {
    setText("");
    setSelectedPriority("medium");
    setDueDateInput("");
  };

  const clearLocalSession = () => {
    if (Platform.OS !== "web") {
      Notifications.cancelAllScheduledNotificationsAsync().catch((error) => {
        console.warn("Could not clear scheduled notifications:", error);
      });
    }

    setIsLoggedIn(false);
    setUser(null);
    setTasks([]);
    setText("");
    setDueDateInput("");
    setEditingId(null);
    setEditText("");
    setEditDueDateInput("");
  };

  const cancelTaskNotification = async (taskId: string) => {
    if (Platform.OS === "web") return;

    try {
      await Notifications.cancelScheduledNotificationAsync(
        getTaskNotificationId(taskId)
      );
    } catch (error) {
      console.warn("Could not cancel task notification:", error);
    }
  };

  const scheduleTaskNotification = async (task: Task) => {
    if (!task.dueDate || task.done || Platform.OS === "web") return false;

    const dueDate = new Date(task.dueDate);
    if (Number.isNaN(dueDate.getTime()) || dueDate.getTime() <= Date.now()) {
      await cancelTaskNotification(task.id);
      return false;
    }

    const hasPermission = await ensureNotificationPermissions();
    if (!hasPermission) return false;

    const identifier = getTaskNotificationId(task.id);
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title: "Task due now",
          body: task.title,
          data: { taskId: task.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: dueDate,
          channelId: NOTIFICATION_CHANNEL_ID,
        },
      });
    } catch (error) {
      console.warn("Could not schedule task notification:", error);
      return false;
    }

    return true;
  };

  const syncTaskNotifications = async (nextTasks: Task[]) => {
    if (Platform.OS === "web") return;

    for (const task of nextTasks) {
      if (task.dueDate && !task.done) {
        await scheduleTaskNotification(task);
      } else {
        await cancelTaskNotification(task.id);
      }
    }
  };

  const showMessage = (title: string, message: string) => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.alert(`${title}\n\n${message}`);
      return;
    }

    Alert.alert(title, message);
  };

  // RESTORE SAVED SESSION AFTER REFRESH
  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        const result = await getCurrentUser();
        if (mounted && result.success && result.user) {
          setUser(result.user);
          setIsLoggedIn(true);
        }
      } catch (error) {
        console.warn("Could not restore saved session:", error);
      } finally {
        if (mounted) {
          setCheckingAuth(false);
        }
      }
    };

    restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

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
        await syncTaskNotifications(result.tasks);
      } else {
        showMessage("Error", "Failed to load tasks");
      }
    } catch (error: any) {
      showMessage("Error", error.message);
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
        const prioritySort = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (prioritySort !== 0) return prioritySort;

        const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        return aDue - bDue;
      }
      return a.done ? 1 : -1;
    });
  }, [filteredTasks]);

  // ADD TASK
  const addTask = async () => {
    if (!text.trim()) {
      showMessage("Error", "Please enter a task");
      return;
    }

    if (!user) {
      showMessage("Error", "User not logged in");
      return;
    }

    const dueDate = parseDueDateInput(dueDateInput);
    if (dueDateInput.trim() && !dueDate) {
      showMessage("Invalid Due Date", "Use YYYY-MM-DD HH:mm, for example 2026-06-15 14:30.");
      return;
    }

    if (dueDate && dueDate.getTime() <= Date.now()) {
      showMessage("Invalid Due Date", "Please choose a future due date and time.");
      return;
    }

    setSyncing(true);
    try {
      const result = await createTask(user.id, {
        title: text,
        priority: selectedPriority,
        description: "",
        dueDate: dueDate?.toISOString(),
      });

      if (result.success && result.task) {
        const newTask = result.task;
        setTasks([newTask, ...tasks]);
        if (newTask.dueDate) {
          const scheduled = await scheduleTaskNotification(newTask);
          if (!scheduled && Platform.OS !== "web") {
            Alert.alert(
              "Task Saved",
              "The task was created, but notification permission was not granted."
            );
          }
        }
        resetTaskForm();
        setShowModal(false);
      } else {
        showMessage("Error", result.error || "Failed to create task");
      }
    } catch (error: any) {
      showMessage("Error", error.message);
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
        const updatedTask = { ...task, done: !task.done };
        setTasks(tasks.map((t) => (t.id === id ? updatedTask : t)));
        if (updatedTask.done) {
          await cancelTaskNotification(id);
        } else {
          await scheduleTaskNotification(updatedTask);
        }
      } else {
        showMessage("Error", result.error || "Failed to update task");
      }
    } catch (error: any) {
      showMessage("Error", error.message);
    } finally {
      setSyncing(false);
    }
  };

  // DELETE TASK
  const confirmDeleteTask = (onConfirm: () => void) => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm("Delete Task\n\nAre you sure you want to delete this task?")) {
        onConfirm();
      }
      return;
    }

    Alert.alert("Delete Task", "Are you sure you want to delete this task?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: onConfirm,
      },
    ]);
  };

  const deleteTaskFromDb = async (id: string) => {
    if (!user) return;

    confirmDeleteTask(async () => {
      setSyncing(true);
      try {
        const result = await deleteTask(id);

        if (result.success) {
          setTasks((currentTasks) =>
            currentTasks.filter((task) => task.id !== id)
          );
          await cancelTaskNotification(id);
        } else {
          showMessage("Error", result.error || "Failed to delete task");
        }
      } catch (error: any) {
        showMessage("Error", error.message);
      } finally {
        setSyncing(false);
      }
    });
  };

  // EDIT TASK
  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setEditText(task.title);
    setEditPriority(task.priority);
    setEditDueDateInput(formatDueDateForInput(task.dueDate));
  };

  const saveEdit = async () => {
    if (!editText.trim()) {
      showMessage("Error", "Task title cannot be empty");
      return;
    }

    if (!user) return;

    const dueDate = parseDueDateInput(editDueDateInput);
    if (editDueDateInput.trim() && !dueDate) {
      showMessage("Invalid Due Date", "Use YYYY-MM-DD HH:mm, for example 2026-06-15 14:30.");
      return;
    }

    if (dueDate && dueDate.getTime() <= Date.now()) {
      showMessage("Invalid Due Date", "Please choose a future due date and time.");
      return;
    }

    setSyncing(true);
    try {
      const result = await updateTask(editingId!, {
        title: editText,
        priority: editPriority,
        description: "",
        dueDate: dueDate?.toISOString() || null,
      });

      if (result.success && result.task) {
        const updatedDueDate = dueDate?.toISOString();
        const updatedTask = tasks.find((task) => task.id === editingId);
        setTasks(
          tasks.map((task) =>
            task.id === editingId
              ? {
                  ...task,
                  title: editText,
                  priority: editPriority,
                  dueDate: updatedDueDate,
                }
              : task
          )
        );
        if (updatedTask) {
          const nextTask = {
            ...updatedTask,
            title: editText,
            priority: editPriority,
            dueDate: updatedDueDate,
          };
          if (nextTask.dueDate) {
            const scheduled = await scheduleTaskNotification(nextTask);
            if (!scheduled && Platform.OS !== "web") {
              Alert.alert(
                "Task Updated",
                "The task was saved, but notification permission was not granted."
              );
            }
          } else {
            await cancelTaskNotification(nextTask.id);
          }
        }
        setEditingId(null);
        setEditText("");
        setEditDueDateInput("");
      } else {
        showMessage("Error", result.error || "Failed to update task");
      }
    } catch (error: any) {
      showMessage("Error", error.message);
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
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    setSyncing(true);
    clearLocalSession();

    try {
      const result = await signOut();
      if (!result.success) {
        console.warn("Supabase sign out failed:", result.error);
      }
    } catch (error: any) {
      console.warn("Logout failed after local session clear:", error.message);
    } finally {
      setSyncing(false);
    }
  };

  if (checkingAuth) {
    return (
      <SafeAreaView style={styles.authLoadingContainer}>
        <ActivityIndicator size="large" color="#4FACFE" />
        <Text style={styles.authLoadingText}>Checking saved session...</Text>
      </SafeAreaView>
    );
  }

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
                <TextInput
                  value={editDueDateInput}
                  onChangeText={setEditDueDateInput}
                  style={styles.editInput}
                  placeholder="Due date: YYYY-MM-DD HH:mm"
                  placeholderTextColor="#7C7C80"
                  keyboardType="numbers-and-punctuation"
                />
                <Text style={styles.dateHint}>Leave blank for no reminder.</Text>
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
                    onPress={() => {
                      setEditingId(null);
                      setEditDueDateInput("");
                    }}
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
                    {item.dueDate && (
                      <Text
                        style={[
                          styles.dueDateLabel,
                          isTaskOverdue(item) && styles.dueDateOverdue,
                        ]}
                      >
                        {formatDueDateForDisplay(item.dueDate)}
                      </Text>
                    )}
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
        onRequestClose={() => {
          setShowModal(false);
          resetTaskForm();
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Task</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowModal(false);
                  resetTaskForm();
                }}
              >
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

            <Text style={styles.modalSectionLabel}>Select Priority</Text>
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

            <Text style={styles.modalSectionLabel}>Due Date & Reminder</Text>
            <TextInput
              placeholder="YYYY-MM-DD HH:mm"
              placeholderTextColor="#7C7C80"
              value={dueDateInput}
              onChangeText={setDueDateInput}
              style={styles.modalInput}
              keyboardType="numbers-and-punctuation"
            />
            <Text style={styles.dateHint}>
              Optional. A local notification is scheduled at this date and time.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowModal(false);
                  resetTaskForm();
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

      {/* LOGOUT CONFIRMATION */}
      <Modal
        animationType="fade"
        transparent
        visible={showLogoutConfirm}
        onRequestClose={() => setShowLogoutConfirm(false)}
      >
        <View style={styles.logoutOverlay}>
          <View style={styles.logoutDialog}>
            <Text style={styles.logoutDialogTitle}>Logout?</Text>
            <Text style={styles.logoutDialogMessage}>
              You will return to the login screen.
            </Text>
            <View style={styles.logoutDialogActions}>
              <TouchableOpacity
                style={styles.logoutCancelButton}
                onPress={() => setShowLogoutConfirm(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.logoutCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.logoutConfirmButton}
                onPress={confirmLogout}
                activeOpacity={0.85}
              >
                <Text style={styles.logoutConfirmText}>Logout</Text>
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

  authLoadingContainer: {
    flex: 1,
    backgroundColor: "#0a0e27",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },

  authLoadingText: {
    color: "#8E92A0",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 14,
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

  logoutOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },

  logoutDialog: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#1a1f3a",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a3050",
    padding: 22,
  },

  logoutDialogTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },

  logoutDialogMessage: {
    color: "#8E92A0",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 22,
  },

  logoutDialogActions: {
    flexDirection: "row",
    gap: 12,
  },

  logoutCancelButton: {
    flex: 1,
    backgroundColor: "#2a3050",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },

  logoutConfirmButton: {
    flex: 1,
    backgroundColor: "#FF6B6B",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },

  logoutCancelText: {
    color: "#8E92A0",
    fontSize: 14,
    fontWeight: "800",
  },

  logoutConfirmText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
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
    marginLeft: 24,
    marginRight: 24,
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
    flexWrap: "wrap",
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

  dueDateLabel: {
    color: "#4FACFE",
    backgroundColor: "rgba(79, 172, 254, 0.1)",
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },

  dueDateOverdue: {
    color: "#FF6B6B",
    backgroundColor: "rgba(255, 107, 107, 0.12)",
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

  modalSectionLabel: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 10,
  },

  dateHint: {
    color: "#8E92A0",
    fontSize: 11,
    lineHeight: 16,
    marginTop: -8,
    marginBottom: 16,
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
