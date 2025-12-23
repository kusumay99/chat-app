import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  List,
  Switch,
  Button,
  Divider,
  TextInput,
  HelperText,
} from 'react-native-paper';
import { useTheme } from '../../contexts/ThemeContext';
import { checkNetworkConnection, getNetworkInfo } from '../../config/api';
import Toast from 'react-native-toast-message';

const SettingsScreen = ({ navigation }) => {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const [networkInfo, setNetworkInfo] = useState(null);
  const [notifications, setNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [serverUrl, setServerUrl] = useState('backend-8kxl.onrender.com');

  useEffect(() => {
    checkNetwork();
  }, []);

  const checkNetwork = async () => {
    try {
      const info = await getNetworkInfo();
      setNetworkInfo(info);
    } catch (error) {
      console.error('Error checking network:', error);
    }
  };

  const testConnection = async () => {
    try {
      const isConnected = await checkNetworkConnection();
      Toast.show({
        type: isConnected ? 'success' : 'error',
        text1: isConnected ? 'Connection Test' : 'Connection Failed',
        text2: isConnected ? 'Network connection is working' : 'Unable to connect to network',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Connection Test Failed',
        text2: 'Unable to test network connection',
      });
    }
  };

  const clearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            Toast.show({
              type: 'success',
              text1: 'Cache Cleared',
              text2: 'All cached data has been removed',
            });
          },
        },
      ]
    );
  };

  const resetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'This will reset all settings to default values. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
            onPress: () => {
            setNotifications(true);
            setSoundEnabled(true);
            setVibrationEnabled(true);
            setServerUrl('backend-8kxl.onrender.com');
            Toast.show({
              type: 'success',
              text1: 'Settings Reset',
              text2: 'All settings have been reset to defaults',
            });
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Card style={styles.card}>
        <Card.Content>
          <List.Section>
            <List.Subheader style={{ color: theme.colors.onSurfaceVariant }}>
              Appearance
            </List.Subheader>
            
            <List.Item
              title="Dark Mode"
              description="Use dark theme"
              left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
              right={() => (
                <Switch
                  value={isDarkMode}
                  onValueChange={toggleTheme}
                  color={theme.colors.primary}
                />
              )}
            />
          </List.Section>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <List.Section>
            <List.Subheader style={{ color: theme.colors.onSurfaceVariant }}>
              Notifications
            </List.Subheader>
            
            <List.Item
              title="Push Notifications"
              description="Receive push notifications"
              left={(props) => <List.Icon {...props} icon="bell-outline" />}
              right={() => (
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  color={theme.colors.primary}
                />
              )}
            />
            
            <Divider />
            
            <List.Item
              title="Sound"
              description="Play notification sounds"
              left={(props) => <List.Icon {...props} icon="volume-high" />}
              right={() => (
                <Switch
                  value={soundEnabled}
                  onValueChange={setSoundEnabled}
                  color={theme.colors.primary}
                  disabled={!notifications}
                />
              )}
            />
            
            <Divider />
            
            <List.Item
              title="Vibration"
              description="Vibrate on notifications"
              left={(props) => <List.Icon {...props} icon="vibrate" />}
              right={() => (
                <Switch
                  value={vibrationEnabled}
                  onValueChange={setVibrationEnabled}
                  color={theme.colors.primary}
                  disabled={!notifications}
                />
              )}
            />
          </List.Section>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <List.Section>
            <List.Subheader style={{ color: theme.colors.onSurfaceVariant }}>
              Network Settings
            </List.Subheader>
            
            <View style={styles.inputContainer}>
              <TextInput
                label="Server URL"
                value={serverUrl}
                onChangeText={setServerUrl}
                mode="outlined"
                placeholder="backend-8kxl.onrender.com"
                style={styles.input}
              />
              <HelperText type="info">
                Enter your development machine's IP address and port
              </HelperText>
            </View>
            
            <List.Item
              title="Test Connection"
              description="Test network connectivity"
              left={(props) => <List.Icon {...props} icon="wifi-check" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={testConnection}
            />
            
            <Divider />
            
            <List.Item
              title="Network Status"
              description={
                networkInfo 
                  ? `${networkInfo.isConnected ? 'Connected' : 'Disconnected'} - ${networkInfo.type}`
                  : 'Checking...'
              }
              left={(props) => <List.Icon {...props} icon="network" />}
              onPress={checkNetwork}
            />
          </List.Section>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <List.Section>
            <List.Subheader style={{ color: theme.colors.onSurfaceVariant }}>
              Data & Storage
            </List.Subheader>
            
            <List.Item
              title="Clear Cache"
              description="Clear all cached data"
              left={(props) => <List.Icon {...props} icon="delete-outline" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={clearCache}
            />
            
            <Divider />
            
            <List.Item
              title="Reset Settings"
              description="Reset all settings to default"
              left={(props) => <List.Icon {...props} icon="restore" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={resetSettings}
            />
          </List.Section>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <List.Section>
            <List.Subheader style={{ color: theme.colors.onSurfaceVariant }}>
              About
            </List.Subheader>
            
            <List.Item
              title="App Version"
              description="1.0.0"
              left={(props) => <List.Icon {...props} icon="information-outline" />}
            />
            
            <Divider />
            
            <List.Item
              title="Build"
              description="Development"
              left={(props) => <List.Icon {...props} icon="hammer-wrench" />}
            />
          </List.Section>
        </Card.Content>
      </Card>

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    margin: 16,
    marginBottom: 8,
    elevation: 2,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  input: {
    marginBottom: 4,
  },
  bottomSpacing: {
    height: 20,
  },
});

export default SettingsScreen;
