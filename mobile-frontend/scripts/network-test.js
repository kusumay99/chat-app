import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  FAB,
  Text,
  useTheme,
} from 'react-native-paper';
import apiClient from '../../config/apiClient';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

const PostsScreen = ({ navigation, route }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const theme = useTheme();
  const { user } = useAuth();

  // Fetch posts
  const fetchPosts = async () => {
    try {
      if (!refreshing) setLoading(true);
      const res = await apiClient.get('/posts');
      setPosts(res.data.posts || []);
    } catch (e) {
      console.error('Error fetching posts:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchPosts();
  }, []);

  // Refresh on focus if refreshKey changes
  useFocusEffect(
    useCallback(() => {
      if (route.params?.refreshKey) {
        fetchPosts();
      }
    }, [route.params?.refreshKey])
  );

  // Toggle like
  const toggleLike = async (postId) => {
    if (!user?._id) return;

    setPosts((prev) =>
      prev.map((p) =>
        p._id === postId
          ? {
              ...p,
              likes: p.likes?.includes(user._id)
                ? p.likes.filter((id) => id !== user._id)
                : [...(p.likes || []), user._id],
            }
          : p
      )
    );

    try {
      await apiClient.post(`/posts/${postId}/like`);
    } catch (e) {
      console.error('Error liking post:', e);
      fetchPosts(); // revert on failure
    }
  };

  // Delete post
  const deletePost = async (postId) => {
    Alert.alert('Delete Post?', 'This action cannot be undone', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/posts/${postId}`);
            fetchPosts();
          } catch (e) {
            console.error('Error deleting post:', e);
          }
        },
      },
    ]);
  };

  // Render post item
  const renderItem = ({ item }) => {
    const isOwner = item.author?._id === user?._id;
    const isLiked = item.likes?.includes(user?._id);

    return (
      <Card style={styles.card}>
        <Card.Title
          title={item.author?.username || 'User'}
          subtitle={new Date(item.createdAt).toLocaleString()}
        />

        <Card.Content>
          <Title>{item.title}</Title>
          <Paragraph>{item.description}</Paragraph>
        </Card.Content>

        <View style={styles.actions}>
          <TouchableOpacity onPress={() => toggleLike(item._id)} style={styles.actionButton}>
            <MaterialCommunityIcons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={22}
              color={isLiked ? '#E11D48' : '#64748B'}
            />
            <Text>{item.likes?.length || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Comments', { postId: item._id })}
            style={styles.actionButton}
          >
            <MaterialCommunityIcons name="comment-outline" size={22} />
            <Text>{item.comments?.length || 0}</Text>
          </TouchableOpacity>

          {isOwner && (
            <>
              <TouchableOpacity
                onPress={() => navigation.navigate('EditPost', { post: item })}
                style={styles.actionButton}
              >
                <MaterialCommunityIcons name="pencil" size={22} />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => deletePost(item._id)} style={styles.actionButton}>
                <MaterialCommunityIcons name="delete" size={22} color="red" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(i) => i._id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchPosts();
            }}
          />
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('CreatePost')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { margin: 10, padding: 10 },
  fab: { position: 'absolute', bottom: 20, right: 20 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  actionButton: {
    alignItems: 'center',
  },
});

export default PostsScreen;
