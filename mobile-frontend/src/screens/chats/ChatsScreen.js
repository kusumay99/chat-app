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
  Badge,
  Text,
  FAB,
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

const ChatsScreen = ({ navigation }) => {
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { user } = useAuth();
  const { onlineUsers } = useSocket();
  const { theme } = useTheme();

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [])
  );

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/messages/conversations`);
      setConversations(response.data.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  };

  const filteredConversations = conversations.filter(conv => {
    const otherUser = conv.participants.find(p => p._id !== user._id);
    return otherUser?.username.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return '';
    try {
      return formatDistanceToNow(new Date(lastSeen), { addSuffix: true });
    } catch (error) {
      return '';
    }
  };

  const getOnlineStatus = (userId) => {
    return onlineUsers.has(userId);
  };

  const renderConversationItem = ({ item }) => {
    const otherUser = item.participants.find(p => p._id !== user._id);
    const unreadCount = item.unreadCount?.get?.(user._id) || 0;
    const isOnline = getOnlineStatus(otherUser?._id);

    return (
      <Surface style={styles.conversationItem}>
        <List.Item
          title={otherUser?.username || 'Unknown User'}
          description={item.lastMessage?.content || 'No messages yet'}
          descriptionNumberOfLines={1}
          onPress={() => navigation.navigate('Chat', { user: otherUser })}
          left={() => (
            <View style={styles.avatarContainer}>
              <Avatar.Text
                size={50}
                label={otherUser?.username?.charAt(0).toUpperCase() || '?'}
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
              {item.lastMessageAt && (
                <Text style={[
                  styles.timeText,
                  { color: theme.colors.onSurfaceVariant }
                ]}>
                  {formatLastSeen(item.lastMessageAt)}
                </Text>
              )}
              {unreadCount > 0 && (
                <Badge
                  size={20}
                  style={[
                    styles.unreadBadge,
                    { backgroundColor: theme.colors.error }
                  ]}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
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
        No conversations yet
      </Text>
      <Text style={[styles.emptySubtext, { color: theme.colors.onSurfaceVariant }]}>
        Start a new conversation by tapping the + button
      </Text>
    </View>
  );

  // animated pulse for loading placeholders
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
        {[0,1,2].map(i => (
          <Animated.View key={i} style={[styles.conversationItem, { opacity: placeholderOpacity, backgroundColor: '#FBFBFD', width: '90%' }]} />
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Searchbar
        placeholder="Search conversations..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={[styles.searchbar, { backgroundColor: theme.colors.surface }]}
      />

      <FlatList
        data={filteredConversations}
        renderItem={renderConversationItem}
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
          filteredConversations.length === 0 ? styles.emptyContainer : styles.listContainer
        }
      />

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('Users')}
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
  conversationItem: {
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
    justifyContent: 'space-between',
    paddingRight: 8,
  },
  timeText: {
    fontSize: 12,
    marginBottom: 4,
  },
  unreadBadge: {
    fontSize: 10,
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
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default ChatsScreen;
