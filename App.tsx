import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";

import { supabase } from "./supabase";

type Task = {
  id: number;
  title: string;
  done: boolean;
};

export default function App() {
  const [text, setText] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // GET TASKS
  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.log("FETCH ERROR:", error.message);
      Alert.alert("Error fetching tasks", error.message);
    } else {
      setTasks(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // ADD TASK
  const addTask = async () => {
    if (!text.trim()) return;

    const { data, error } = await supabase
      .from("tasks")
      .insert([
        {
          title: text,
          done: false,
        },
      ])
      .select();

    if (error) {
      console.log("INSERT ERROR:", error.message);
      Alert.alert("Insert Failed", error.message);
    } else {
      console.log("INSERT SUCCESS:", data);
      setText("");
      fetchTasks();
    }
  };

  // TOGGLE TASK
  const toggleTask = async (id: number, current: boolean) => {
    const { error } = await supabase
      .from("tasks")
      .update({ done: !current })
      .eq("id", id);

    if (error) {
      console.log("UPDATE ERROR:", error.message);
      Alert.alert("Update Failed", error.message);
    } else {
      fetchTasks();
    }
  };

  // DELETE TASK
  const deleteTask = async (id: number) => {
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id);

    if (error) {
      console.log("DELETE ERROR:", error.message);
      Alert.alert("Delete Failed", error.message);
    } else {
      fetchTasks();
    }
  };

  const completed = useMemo(
    () => tasks.filter((t) => t.done).length,
    [tasks]
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>Tasks</Text>
        <Text style={styles.counter}>
          {completed}/{tasks.length}
        </Text>
      </View>

      {/* INPUT */}
      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Add a task..."
          placeholderTextColor="#777"
          style={styles.input}
        />

        <TouchableOpacity style={styles.button} onPress={addTask}>
          <Text style={styles.buttonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* LIST */}
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => toggleTask(item.id, item.done)}
            >
              <Text style={[styles.task, item.done && styles.done]}>
                {item.title}
              </Text>
              <Text style={styles.status}>
                {item.done ? "Completed" : "Pending"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => deleteTask(item.id)}>
              <Text style={styles.delete}>✕</Text>
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
    backgroundColor: "#111",
    padding: 20,
  },

  loading: {
    flex: 1,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  title: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "700",
  },

  counter: {
    color: "#aaa",
    fontSize: 16,
  },

  inputRow: {
    flexDirection: "row",
    marginBottom: 20,
  },

  input: {
    flex: 1,
    backgroundColor: "#1c1c1e",
    color: "#fff",
    padding: 14,
    borderRadius: 12,
    marginRight: 10,
  },

  button: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    justifyContent: "center",
    borderRadius: 12,
  },

  buttonText: {
    color: "#000",
    fontWeight: "700",
  },

  card: {
    flexDirection: "row",
    backgroundColor: "#1c1c1e",
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    alignItems: "center",
  },

  task: {
    color: "#fff",
    fontSize: 16,
  },

  done: {
    textDecorationLine: "line-through",
    color: "#777",
  },

  status: {
    color: "#888",
    fontSize: 12,
    marginTop: 4,
  },

  delete: {
    color: "#ff4d4d",
    fontSize: 18,
    paddingLeft: 10,
  },
});