import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import {
  Searchbar,
  List,
  Avatar,
  Text,
  Surface,
} from 'react-native-paper';
import { Animated, Easing } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';
import { formatDistanceToNow } from 'date-fns';

const UsersScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { user } = useAuth();
  const { onlineUsers } = useSocket();
  const { theme } = useTheme();

  useFocusEffect(
    useCallback(() => {
      fetchUsers();
    }, [])
  );

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/users`);
      // Filter out current user
      const filteredUsers = response.data.users.filter(u => u._id !== user._id);
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'Never';
    try {
      return formatDistanceToNow(new Date(lastSeen), { addSuffix: true });
    } catch (error) {
      return 'Unknown';
    }
  };

  const getOnlineStatus = (userId) => {
    return onlineUsers.has(userId);
  };

  const handleUserPress = (selectedUser) => {
    navigation.navigate('Chat', { user: selectedUser });
  };

  const renderUserItem = ({ item }) => {
    const isOnline = getOnlineStatus(item._id);

    return (
      <Surface style={styles.userItem}>
        <List.Item
          title={item.username}
          description={isOnline ? 'Online' : `Last seen ${formatLastSeen(item.lastSeen)}`}
          onPress={() => handleUserPress(item)}
          left={() => (
            <View style={styles.avatarContainer}>
              <Avatar.Text
                size={50}
                label={item.username.charAt(0).toUpperCase()}
                style={[
                  styles.avatar,
                  { backgroundColor: theme.colors.primary }
                ]}
              />
              {isOnline && (
                <View style={[
                  styles.onlineIndicator,
                  { backgroundColor: theme.colors.tertiary }
                ]} />
              )}
            </View>
          )}
          right={() => (
            <View style={styles.rightContent}>
              <Text style={[
                styles.statusText,
                { 
                  color: isOnline ? theme.colors.tertiary : theme.colors.onSurfaceVariant,
                  fontWeight: isOnline ? 'bold' : 'normal'
                }
              ]}>
                {isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
          )}
          style={styles.listItem}
        />
      </Surface>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
        {searchQuery ? 'No users found' : 'No users available'}
      </Text>
      <Text style={[styles.emptySubtext, { color: theme.colors.onSurfaceVariant }]}>
        {searchQuery ? 'Try a different search term' : 'Check back later for new users'}
      </Text>
    </View>
  );

  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const placeholderOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}> 
        {[0,1,2,3].map(i => (
          <Animated.View key={i} style={[styles.userItem, { opacity: placeholderOpacity, width: '92%', backgroundColor: '#FBFBFD' }]} />
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Searchbar
        placeholder="Search users..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={[styles.searchbar, { backgroundColor: theme.colors.surface }]}
      />

      <FlatList
        data={filteredUsers}
        renderItem={renderUserItem}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={
          filteredUsers.length === 0 ? styles.emptyContainer : styles.listContainer
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchbar: {
    margin: 16,
    elevation: 2,
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  userItem: {
    marginBottom: 8,
    borderRadius: 12,
    elevation: 1,
  },
  listItem: {
    paddingVertical: 8,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    marginLeft: 8,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'white',
  },
  rightContent: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 8,
  },
  statusText: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default UsersScreen;
