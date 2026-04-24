import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Footer = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>© 2026 All Rights Reserved</Text>
    </View>
  );
};

export default Footer;

const styles = StyleSheet.create({
  container: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 12,
    color: '#666',
  },
});