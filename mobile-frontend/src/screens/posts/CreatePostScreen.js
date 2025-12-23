import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Card, Title, Snackbar } from 'react-native-paper';
import apiClient from '../../config/apiClient';
import { useAuth } from '../../contexts/AuthContext';

const CreatePostScreen = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState({ visible: false, message: '' });

  const { token, isAuthenticated } = useAuth();

  const validate = () =>
    title.trim().length >= 3 && description.trim().length >= 5;

  const handleSubmit = async () => {
    if (!isAuthenticated || !token) {
      setSnack({ visible: true, message: '🔒 Please login again' });
      return;
    }

    if (!validate()) {
      setSnack({
        visible: true,
        message: 'Title (3+) and description (5+) required',
      });
      return;
    }

    setLoading(true);

    try {
      console.log('POST /posts', { title, description });

      const res = await apiClient.post('/posts', {
        title,
        description,
      });

      console.log('Create post success:', res.data);

      setSnack({ visible: true, message: '✅ Post created!' });

      setTimeout(() => {
        navigation.navigate('Posts', { refreshKey: Date.now() });
      }, 600);
    } catch (err) {
      console.error('Create post error:', err?.response || err);

      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        '❌ Failed to create post';

      setSnack({ visible: true, message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <Title>Create Post</Title>

            <TextInput
              label="Title"
              value={title}
              onChangeText={setTitle}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Description"
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              multiline
              numberOfLines={4}
              style={styles.input}
            />

            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading || !validate()}
            >
              Create
            </Button>
          </Card.Content>
        </Card>

        <Snackbar
          visible={snack.visible}
          onDismiss={() => setSnack({ visible: false, message: '' })}
          duration={2500}
        >
          {snack.message}
        </Snackbar>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F9FAFB' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12 },
  input: { marginBottom: 12 },
});

export default CreatePostScreen;
