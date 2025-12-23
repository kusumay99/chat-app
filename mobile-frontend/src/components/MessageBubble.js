import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Surface, Avatar } from 'react-native-paper';
import { formatDistanceToNow } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const MessageBubble = ({ message = {}, isOwn, showAvatar, theme }) => {
  const senderName = message.sender?.username || 'U';
  const content = message.content || '';
  const createdAt = message.createdAt || new Date().toISOString();

  const formatTime = (timestamp) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return '';
    }
  };

  const renderStatusIcon = () => {
    if (!isOwn) return null;

    switch (message.status) {
      case 'sent':
        return <MaterialCommunityIcons name="check" size={14} color="#9E9E9E" style={styles.tickIcon} />;
      case 'delivered':
        return (
          <View style={styles.tickRow}>
            <MaterialCommunityIcons name="check" size={14} color="#9E9E9E" />
            <MaterialCommunityIcons name="check" size={14} color="#9E9E9E" style={{ marginLeft: -2 }} />
          </View>
        );
      case 'read':
        return (
          <View style={styles.tickRow}>
            <MaterialCommunityIcons name="check" size={14} color="green" />
            <MaterialCommunityIcons name="check" size={14} color="green" style={{ marginLeft: -2 }} />
          </View>
        );
      default:
        return <MaterialCommunityIcons name="clock-outline" size={14} color="#9E9E9E" style={styles.tickIcon} />;
    }
  };

  return (
    <View style={[styles.container, isOwn ? styles.ownMessage : styles.otherMessage]}>
      {!isOwn && showAvatar && (
        <Avatar.Text
          size={32}
          label={senderName.charAt(0).toUpperCase()}
          style={[styles.avatar, { backgroundColor: theme.colors.primary || '#6200ee' }]}
        />
      )}
      {!isOwn && !showAvatar && <View style={styles.avatarSpacer} />}

      <View style={[styles.bubbleContainer, isOwn ? styles.ownBubbleContainer : styles.otherBubbleContainer]}>
        <Surface
          style={[
            styles.bubble,
            {
              backgroundColor: isOwn ? theme.colors.primary || '#6200ee' : theme.colors.surface || '#FFF',
              elevation: 2,
            },
          ]}
        >
          <Text style={[styles.messageText, { color: isOwn ? theme.colors.onPrimary || '#FFF' : theme.colors.onSurface || '#000' }]}>
            {content}
          </Text>

          <View style={styles.messageFooter}>
            <Text
              style={[
                styles.timeText,
                { color: isOwn ? theme.colors.onPrimary || '#FFF' : theme.colors.onSurfaceVariant || '#9E9E9E' },
              ]}
            >
              {formatTime(createdAt)}
            </Text>
            {renderStatusIcon()}
          </View>
        </Surface>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', marginVertical: 2, paddingHorizontal: 8 },
  ownMessage: { justifyContent: 'flex-end' },
  otherMessage: { justifyContent: 'flex-start' },
  avatar: { marginRight: 8, alignSelf: 'flex-end' },
  avatarSpacer: { width: 40 },
  bubbleContainer: { maxWidth: '75%', minWidth: '20%' },
  ownBubbleContainer: { alignItems: 'flex-end' },
  otherBubbleContainer: { alignItems: 'flex-start' },
  bubble: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, marginVertical: 1 },
  messageText: { fontSize: 16, lineHeight: 20 },
  messageFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
  timeText: { fontSize: 11, marginRight: 4 },
  tickIcon: { marginLeft: 2 },
  tickRow: { flexDirection: 'row', alignItems: 'center', marginLeft: 2 },
});

export default MessageBubble;
