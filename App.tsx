import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import Homepage from './src/screens/Homepage';

export default function App() {
  return (
    <>
      <Homepage message="Welcome to Navarro-iptech2-app Homepage!" />
      <StatusBar style="auto" />
    </>
  );
}
