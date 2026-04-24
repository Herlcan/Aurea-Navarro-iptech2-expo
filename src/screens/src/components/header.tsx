import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type HeaderProps = {
  name: string;
};

const Header: React.FC<HeaderProps> = ({ name }) => {
  return (
    <View style={styles.container}>
      {/* Dynamic Title */}
      <Text style={styles.title}>Hello {name}</Text>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#888" style={styles.icon} />
        <TextInput
          placeholder="Search"
          placeholderTextColor="#888"
          style={styles.input}
        />
      </View>
    </View>
  );
};

export default Header;

const styles = StyleSheet.create({
  container: {
    paddingTop: 50,
    paddingHorizontal: 15,
    paddingBottom: 10,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#efefef',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
  },
  icon: {
    marginRight: 5,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
});