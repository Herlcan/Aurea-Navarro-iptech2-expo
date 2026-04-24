import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet } from "react-native";
import { users } from "./mockData";

export default function LoginScreen({ setIsLoggedIn, setUser }: any) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    console.log("Login attempt:", username, password);

    const foundUser = users.find(
      (u) => u.username === username && u.password === password
    );

    if (foundUser) {
      console.log("Login successful:", foundUser);
      setUser(foundUser);
      setIsLoggedIn(true);
    } else {
      console.log("Login failed");
      alert("Invalid credentials");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      <TextInput
        placeholder="Username"
        style={styles.input}
        onChangeText={setUsername}
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        style={styles.input}
        onChangeText={setPassword}
      />

      <Button title="Login" onPress={handleLogin} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  title: { fontSize: 24, marginBottom: 20, textAlign: "center" },
  input: {
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
});