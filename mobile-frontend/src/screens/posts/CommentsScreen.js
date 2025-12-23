import React, { useEffect, useState, useRef } from 'react';
import {
  FlatList,
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Text, TextInput, Button, Card } from 'react-native-paper';
import apiClient from '../../config/apiClient';

const CommentsScreen = ({ route }) => {
  const postId = route?.params?.postId;
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);

  if (!postId) {
    return (
      <View style={styles.center}>
        <Text>No post selected</Text>
      </View>
    );
  }

  // Load comments from server
  const loadComments = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/posts/${postId}/comments`);
      setComments(res.data.comments || []);
    } catch (e) {
      console.error('Load comments error:', e.response?.data || e.message);
    } finally {
      setLoading(false);
    }
  };

  // Send a new comment
  const sendComment = async () => {
    if (!text.trim()) return;

    try {
      setSending(true);
      await apiClient.post(`/posts/${postId}/comment`, { text: text.trim() });
      setText('');
      await loadComments();
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (e) {
      console.error('Send comment error:', e.response?.data || e.message);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, []);

  const renderComment = ({ item }) => (
    <Card style={styles.card}>
      <Text style={styles.author}>{item.user?.username || 'User'}</Text>
      <Text>{item.text}</Text>
    </Card>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={comments}
          keyExtractor={(item) => item._id}
          renderItem={renderComment}
          refreshing={loading}
          onRefresh={loadComments}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      )}

      <View style={styles.inputContainer}>
        <TextInput
          mode="outlined"
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Add comment..."
          multiline
        />
        <Button
          mode="contained"
          onPress={sendComment}
          loading={sending}
          disabled={sending || !text.trim()}
        >
          Send
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { marginHorizontal: 8, marginVertical: 4, padding: 8 },
  author: { fontWeight: 'bold', marginBottom: 4 },
  inputContainer: {
    flexDirection: 'row',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    backgroundColor: '#fff',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  input: { flex: 1, marginRight: 8 },
});

export default CommentsScreen;
