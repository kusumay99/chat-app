import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { AuthProvider } from './src/contexts/AuthContext';
import { SocketProvider } from './src/contexts/SocketContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import { theme } from './src/theme/theme';

export default function App() {
  return (
    <ThemeProvider>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <SocketProvider>
            <NavigationContainer>
              <StatusBar style="auto" />
              <AppNavigator />
              <Toast />
            </NavigationContainer>
          </SocketProvider>
        </AuthProvider>
      </PaperProvider>
    </ThemeProvider>
  );
}
