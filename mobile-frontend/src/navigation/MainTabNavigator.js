import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../contexts/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Screens
import ChatsScreen from '../screens/chats/ChatsScreen';
import PostsScreen from '../screens/posts/PostsScreen';
import UsersScreen from '../screens/users/UsersScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Chats') {
            iconName = focused ? 'chat' : 'chat-outline';
          } else if (route.name === 'Posts') {
            iconName = focused ? 'post' : 'post-outline';
          } else if (route.name === 'Users') {
            iconName = focused ? 'account-group' : 'account-group-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'account' : 'account-outline';
          }

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerStyle: {
          backgroundColor: theme.colors.surface,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 20,
        },
      })}
    >
      <Tab.Screen 
        name="Chats" 
        component={ChatsScreen}
        options={{
          title: 'Chats',
          tabBarLabel: 'Chats',
        }}
      />
      <Tab.Screen 
        name="Posts" 
        component={PostsScreen}
        options={{
          title: 'Posts',
          tabBarLabel: 'Posts',
        }}
      />
      <Tab.Screen 
        name="Users" 
        component={UsersScreen}
        options={{
          title: 'Users',
          tabBarLabel: 'Users',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
