import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';

import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Main App
import MainTabNavigator from './MainTabNavigator';

// Other Screens
import ChatScreen from '../screens/chat/ChatScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

// Post Screens
import PostsScreen from '../screens/posts/PostsScreen';
import CreatePostScreen from '../screens/posts/CreatePostScreen';
import EditPostScreen from '../screens/posts/EditPostScreen';
import CommentsScreen from '../screens/posts/CommentsScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { isAuthenticated, loading } = useAuth();
  const { theme } = useTheme();

  // 🔄 App loading state
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      {/* 🔐 AUTH STACK */}
      {!isAuthenticated ? (
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ headerShown: false }}
          />
        </>
      ) : (
        <>
          {/* 🏠 MAIN TABS */}
          <Stack.Screen
            name="MainTabs"
            component={MainTabNavigator}
            options={{ headerShown: false }}
          />

          {/* 📝 POSTS */}
          <Stack.Screen
            name="Posts"
            component={PostsScreen}
            options={{ title: 'Posts' }}
          />

          <Stack.Screen
            name="CreatePost"
            component={CreatePostScreen}
            options={{ title: 'Create Post' }}
          />

          <Stack.Screen
            name="EditPost"
            component={EditPostScreen}
            options={{ title: 'Edit Post' }}
          />

          <Stack.Screen
            name="Comments"
            component={CommentsScreen}
            options={{ title: 'Comments' }}
          />

          {/* 💬 CHAT */}
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={({ route }) => ({
              title: route.params?.user?.username || 'Chat',
              headerBackTitleVisible: false,
            })}
          />

          {/* 👤 PROFILE */}
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ title: 'Profile' }}
          />

          {/* ⚙️ SETTINGS */}
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: 'Settings' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
