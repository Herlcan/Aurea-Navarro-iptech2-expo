import React, { useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "./src/screens/src/components/LoginScreen";
import HomeScreen from "./src/screens/src/components/HomeScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<any>(null);

  console.log("App state:", { isLoggedIn, user });

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!isLoggedIn ? (
          <Stack.Screen name="Login">
            {(props) => (
              <LoginScreen
                {...props}
                setIsLoggedIn={setIsLoggedIn}
                setUser={setUser}
              />
            )}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Home">
            {(props) => (
              <HomeScreen
                {...props}
                setIsLoggedIn={setIsLoggedIn}
                user={user}
              />
            )}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}