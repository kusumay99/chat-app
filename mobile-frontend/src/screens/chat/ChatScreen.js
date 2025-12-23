import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { TextInput, Text, Surface, Avatar, IconButton } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import axios from 'axios';

import { API_BASE_URL } from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';

const ChatScreen = ({ route, navigation }) => {
  const { user: selectedUser } = route.params;
  const { user, token } = useAuth();
  const { socket, onlineUsers, messages: socketMessages } = useSocket();

  const flatListRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);

  /* ================= HEADER ================= */
  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.header}>
          <Avatar.Text
            size={36}
            label={selectedUser.username[0].toUpperCase()}
          />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.headerName}>{selectedUser.username}</Text>
            <Text style={styles.headerStatus}>
              {onlineUsers.has(selectedUser._id) ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
      ),
    });
  }, [onlineUsers]);

  /* ================= FETCH MESSAGES ================= */
  const fetchMessages = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${API_BASE_URL}/messages/conversation/${selectedUser._id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessages(res.data.messages || []);
    } catch (err) {
      console.log('Fetch messages error:', err.response?.data || err.message);
    } finally {
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [selectedUser]);

  /* ================= SOCKET MERGE ================= */
  useEffect(() => {
    if (!socketMessages.length) return;

    const filtered = socketMessages.filter(
      m =>
        (m.sender?._id === user._id &&
          m.receiver?._id === selectedUser._id) ||
        (m.sender?._id === selectedUser._id &&
          m.receiver?._id === user._id)
    );

    if (!filtered.length) return;

    setMessages(prev => {
      const merged = [...prev, ...filtered];
      return merged.filter(
        (v, i, a) => i === a.findIndex(m => m._id === v._id)
      );
    });

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [socketMessages]);

  /* ================= MARK AS READ ================= */
  useEffect(() => {
    const unread = messages.filter(
      m =>
        m.receiver?._id === user._id &&
        m.sender?._id === selectedUser._id &&
        m.status !== 'read'
    );

    if (unread.length && socket?.connected) {
      socket.emit('messageRead', {
        from: selectedUser._id,
        to: user._id,
      });

      setMessages(prev =>
        prev.map(m =>
          unread.find(u => u._id === m._id)
            ? { ...m, status: 'read', readAt: new Date() }
            : m
        )
      );
    }
  }, [messages]);

  /* ================= SEND TEXT ================= */
  const handleSend = () => {
    if (!text.trim()) return;

    const message = {
      _id: Date.now().toString(),
      sender: user,
      receiver: selectedUser,
      messageType: 'text',
      content: text.trim(),
      status: 'sent',
      createdAt: new Date(),
    };

    socket?.emit('sendMessage', message);
    setMessages(prev => [...prev, message]);
    setText('');
  };

  /* ================= SEND FILE ================= */
  const sendFile = async asset => {
    try {
      const formData = new FormData();
      formData.append('receiverId', selectedUser._id);
      formData.append('file', {
        uri: asset.uri,
        name: asset.fileName || asset.name || 'file',
        type: asset.mimeType || 'image/jpeg',
      });

      const res = await axios.post(
        `${API_BASE_URL}/messages/send-file`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setMessages(prev => [...prev, res.data.message]);
    } catch (err) {
      console.log('Send file error:', err.response?.data || err.message);
    }
  };

  /* ================= IMAGE PICKER ================= */
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length) {
      sendFile(result.assets[0]);
    }
  };

  /* ================= CAMERA ================= */
  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Camera permission required');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length) {
      sendFile(result.assets[0]);
    }
  };

  /* ================= DOCUMENT PICKER ================= */
  const pickDocument = async () => {
    const res = await DocumentPicker.getDocumentAsync({});
    if (res.type === 'success') {
      sendFile(res);
    }
  };

  /* ================= MESSAGE STATUS ================= */
  const getStatusText = status => {
    if (status === 'sent') return '✓';
    if (status === 'delivered') return '✓✓';
    if (status === 'read') return '✓✓';
    return '';
  };

  /* ================= RENDER MESSAGE ================= */
  const renderMessage = ({ item }) => {
    const isOwn = item.sender?._id === user._id;
    const fileUri = item.fileUrl?.startsWith('http')
      ? item.fileUrl
      : `${API_BASE_URL}${item.fileUrl}`;

    return (
      <View style={[styles.bubble, isOwn ? styles.own : styles.other]}>
        {item.messageType === 'text' && <Text>{item.content}</Text>}

        {item.messageType === 'image' && (
          <Image source={{ uri: fileUri }} style={styles.image} />
        )}

        {item.messageType === 'file' && (
          <Text style={styles.link} onPress={() => Linking.openURL(fileUri)}>
            📎 Download file
          </Text>
        )}

        {isOwn && (
          <Text style={[styles.status, item.status === 'read' && styles.read]}>
            {getStatusText(item.status)}
          </Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item._id}
        renderItem={renderMessage}
        contentContainerStyle={{ padding: 12 }}
      />

      <Surface style={styles.inputBox}>
        <View style={styles.row}>
          <IconButton icon="camera" onPress={openCamera} />
          <IconButton icon="paperclip" onPress={pickDocument} />
          <IconButton icon="image" onPress={pickImage} />

          <TextInput
            style={{ flex: 1 }}
            placeholder="Type a message..."
            value={text}
            onChangeText={setText}
            mode="outlined"
          />

          <IconButton icon="send" onPress={handleSend} />
        </View>
      </Surface>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center' },
  headerName: { fontWeight: 'bold' },
  headerStatus: { fontSize: 12, opacity: 0.6 },
  bubble: {
    padding: 10,
    borderRadius: 8,
    marginVertical: 4,
    maxWidth: '80%',
  },
  own: { alignSelf: 'flex-end', backgroundColor: '#DCF8C6' },
  other: { alignSelf: 'flex-start', backgroundColor: '#EEE' },
  image: { width: 200, height: 200, borderRadius: 6 },
  link: { color: '#1976d2', marginTop: 6 },
  status: { fontSize: 10, alignSelf: 'flex-end', marginTop: 2 },
  read: { color: '#2196f3' },
  inputBox: { padding: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
});

export default ChatScreen;
