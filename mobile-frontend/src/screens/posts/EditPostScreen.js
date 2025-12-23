import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Card, Title } from 'react-native-paper';
import apiClient from '../../config/apiClient';

const EditPostScreen = ({ route, navigation }) => {
  const { post } = route.params;

  // Use correct backend field
  const [title, setTitle] = useState(post.title || '');
  const [content, setContent] = useState(post.content || '');
  const [loading, setLoading] = useState(false);

  const updatePost = async () => {
    if (!content.trim()) {
      return Alert.alert('Validation', 'Content cannot be empty.');
    }

    try {
      setLoading(true);

      // Call backend API
      const res = await apiClient.put(`/posts/${post._id}`, {
        title: title.trim(),
        description: content.trim(), // backend expects 'description' field
      });

      if (res.data.success) {
        Alert.alert('Success', 'Post updated successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', res.data.message || 'Update failed');
      }
    } catch (e) {
      console.error('Update error:', e.response?.data || e.message);
      Alert.alert('Error', e.response?.data?.message || 'Server error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Card>
        <Card.Content>
          <Title>Edit Post</Title>

          <TextInput
            label="Title"
            value={title}
            onChangeText={setTitle}
            style={styles.input}
          />
          <TextInput
            label="Content"
            value={content}
            multiline
            onChangeText={setContent}
            style={[styles.input, { height: 120 }]}
          />

          <Button
            mode="contained"
            onPress={updatePost}
            loading={loading}
            disabled={loading}
            style={styles.button}
          >
            Update
          </Button>
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16 },
  input: { marginTop: 12, marginBottom: 12 },
  button: { marginTop: 16 },
});

export default EditPostScreen;
