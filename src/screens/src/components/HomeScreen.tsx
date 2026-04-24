import React from "react";
import { View, Text, Button, StyleSheet, FlatList } from "react-native";
import { posts } from "./mockData";

export default function HomeScreen({ setIsLoggedIn, user }: any) {
  const handleLogout = () => {
    console.log("User logged out:", user);
    setIsLoggedIn(false);
  };

  console.log("Home screen rendered for:", user);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome, {user?.name}!</Text>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => {
          console.log("Rendering post:", item);

          return (
            <View style={styles.card}>
              <Text style={styles.postTitle}>{item.title}</Text>
              <Text>{item.content}</Text>
            </View>
          );
        }}
      />

      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 20, marginBottom: 10 },
  card: {
    padding: 10,
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 10,
  },
  postTitle: {
    fontWeight: "bold",
    marginBottom: 5,
  },
});