import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface HomepageProps {
    message: string;
}

const Homepage: React.FC<HomepageProps> = ({ message }) => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome to Navarro-iptech2-app!</Text>
            <Text style={styles.message}>{message}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f8ff',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#333',
    },
    message: {
        fontSize: 18,
        textAlign: 'center',
        color: '#666',
        lineHeight: 24,
    },
});

export default Homepage;

