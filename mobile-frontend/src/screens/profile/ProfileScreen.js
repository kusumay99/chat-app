import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  Text,
  Avatar,
  Card,
  List,
  Switch,
  Button,
  Divider,
  Surface,
} from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useSocket } from '../../contexts/SocketContext';

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const { isConnected } = useSocket();

  const handleLogout = async () => {
    await logout();
  };

  const handleEditProfile = () => {
    // Navigate to edit profile screen (to be implemented)
    navigation.navigate('Settings');
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Surface style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <Avatar.Text
          size={80}
          label={user?.username?.charAt(0).toUpperCase() || '?'}
          style={[styles.avatar, { backgroundColor: theme.colors.primary }]}
        />
        <Text style={[styles.username, { color: theme.colors.onSurface }]}>
          {user?.username || 'Unknown User'}
        </Text>
        <Text style={[styles.email, { color: theme.colors.onSurfaceVariant }]}>
          {user?.email || 'No email'}
        </Text>
        
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusIndicator,
            { backgroundColor: isConnected ? theme.colors.tertiary : theme.colors.error }
          ]} />
          <Text style={[styles.statusText, { color: theme.colors.onSurfaceVariant }]}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
      </Surface>

      <Card style={styles.card}>
        <Card.Content>
          <List.Section>
            <List.Subheader style={{ color: theme.colors.onSurfaceVariant }}>
              Preferences
            </List.Subheader>
            
            <List.Item
              title="Dark Mode"
              description="Toggle dark theme"
              left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
              right={() => (
                <Switch
                  value={isDarkMode}
                  onValueChange={toggleTheme}
                  color={theme.colors.primary}
                />
              )}
            />
            
            <Divider />
            
            <List.Item
              title="Notifications"
              description="Manage notification settings"
              left={(props) => <List.Icon {...props} icon="bell-outline" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => {
                // Navigate to notifications settings
              }}
            />
            
            <Divider />
            
            <List.Item
              title="Privacy"
              description="Privacy and security settings"
              left={(props) => <List.Icon {...props} icon="shield-outline" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => {
                // Navigate to privacy settings
              }}
            />
          </List.Section>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <List.Section>
            <List.Subheader style={{ color: theme.colors.onSurfaceVariant }}>
              Account
            </List.Subheader>
            
            <List.Item
              title="Edit Profile"
              description="Update your profile information"
              left={(props) => <List.Icon {...props} icon="account-edit-outline" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={handleEditProfile}
            />
            
            <Divider />
            
            <List.Item
              title="Settings"
              description="App settings and preferences"
              left={(props) => <List.Icon {...props} icon="cog-outline" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('Settings')}
            />
          </List.Section>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <List.Section>
            <List.Subheader style={{ color: theme.colors.onSurfaceVariant }}>
              Support
            </List.Subheader>
            
            <List.Item
              title="Help & Support"
              description="Get help and contact support"
              left={(props) => <List.Icon {...props} icon="help-circle-outline" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => {
                // Navigate to help screen
              }}
            />
            
            <Divider />
            
            <List.Item
              title="About"
              description="App version and information"
              left={(props) => <List.Icon {...props} icon="information-outline" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => {
                // Navigate to about screen
              }}
            />
          </List.Section>
        </Card.Content>
      </Card>

      <View style={styles.logoutContainer}>
        <Button
          mode="contained"
          onPress={handleLogout}
          style={[styles.logoutButton, { backgroundColor: theme.colors.error }]}
          contentStyle={styles.logoutButtonContent}
          icon="logout"
        >
          Logout
        </Button>
      </View>

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: 24,
    elevation: 2,
  },
  avatar: {
    marginBottom: 16,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
  },
  card: {
    margin: 16,
    marginBottom: 8,
    elevation: 2,
  },
  logoutContainer: {
    padding: 16,
  },
  logoutButton: {
    borderRadius: 8,
  },
  logoutButtonContent: {
    paddingVertical: 8,
  },
  bottomSpacing: {
    height: 20,
  },
});

export default ProfileScreen;
