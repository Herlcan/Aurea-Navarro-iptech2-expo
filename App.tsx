import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  FlatList,
} from "react-native";

type Task = {
  id: string;
  title: string;
  done: boolean;
};

export default function App() {
  const [text, setText] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);

  // ADD TASK
  const addTask = () => {
    if (!text.trim()) return;

    const newTask: Task = {
      id: Date.now().toString(),
      title: text,
      done: false,
    };

    setTasks([newTask, ...tasks]);
    setText("");
  };

  // TOGGLE TASK STATUS
  const toggleTask = (id: string) => {
    setTasks(
      tasks.map((tasks) =>
        tasks.id === id
          ? { ...tasks, done: !tasks.done }
          : tasks
      )
    );
  };

  // DELETE TASK
  const deleteTask = (id: string) => {
    setTasks(tasks.filter((tasks) => tasks.id !== id));
  };

  // COMPLETED COUNT
  const totalDone = useMemo(
    () => tasks.filter((tasks) => tasks.done).length,
    [tasks]
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>Tasks</Text>

        <View style={styles.counterBox}>
          <Text style={styles.counterText}>
            {totalDone}/{tasks.length}
          </Text>
        </View>
      </View>

      {/* INPUT */}
      <View style={styles.inputWrapper}>
        <TextInput
          placeholder="Add a task..."
          placeholderTextColor="#7C7C80"
          value={text}
          onChangeText={setText}
          style={styles.input}
        />

        <TouchableOpacity
          style={styles.addButton}
          onPress={addTask}
          activeOpacity={0.8}
        >
          <Text style={styles.addText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* TASK LIST */}
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 40,
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              No tasks yet
            </Text>

            <Text style={styles.emptySubtitle}>
              Add something important to do.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.taskCard}>

            {/* LEFT SIDE */}
            <TouchableOpacity
              style={styles.taskLeft}
              activeOpacity={0.8}
              onPress={() => toggleTask(item.id)}
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

              <View>
                <Text
                  style={[
                    styles.taskText,
                    item.done && styles.taskDone,
                  ]}
                >
                  {item.title}
                </Text>

                <Text
                  style={[
                    styles.statusText,
                    item.done
                      ? styles.completedStatus
                      : styles.pendingStatus,
                  ]}
                >
                  {item.done ? "Completed" : "Pending"}
                </Text>
              </View>
            </TouchableOpacity>

            {/* DELETE BUTTON */}
            <TouchableOpacity
              onPress={() => deleteTask(item.id)}
              style={styles.deleteButton}
            >
              <Text style={styles.deleteText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111111",
    paddingHorizontal: 22,
    paddingTop: 60,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: -1,
  },

  counterBox: {
    backgroundColor: "#1C1C1E",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },

  counterText: {
    color: "#A1A1AA",
    fontSize: 14,
    fontWeight: "600",
  },

  inputWrapper: {
    flexDirection: "row",
    marginBottom: 28,
  },

  input: {
    flex: 1,
    backgroundColor: "#1C1C1E",
    color: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 18,
    fontSize: 16,
    marginRight: 12,
  },

  addButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
  },

  addText: {
    color: "#111111",
    fontWeight: "700",
    fontSize: 15,
  },

  taskCard: {
    backgroundColor: "#1C1C1E",
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  taskLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  circle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#3A3A3C",
    marginRight: 14,
    justifyContent: "center",
    alignItems: "center",
  },

  circleDone: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FFFFFF",
  },

  check: {
    color: "#111111",
    fontSize: 13,
    fontWeight: "700",
  },

  taskText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },

  taskDone: {
    textDecorationLine: "line-through",
    color: "#7C7C80",
  },

  statusText: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "500",
  },

  completedStatus: {
    color: "#4ADE80",
  },

  pendingStatus: {
    color: "#FACC15",
  },

  deleteButton: {
    marginLeft: 12,
    backgroundColor: "#2A2A2D",
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  deleteText: {
    color: "#FF6B6B",
    fontSize: 16,
    fontWeight: "700",
  },

  emptyState: {
    marginTop: 100,
    alignItems: "center",
  },

  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 8,
  },

  emptySubtitle: {
    color: "#7C7C80",
    fontSize: 15,
  },
});