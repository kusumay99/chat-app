import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Card, Title, Paragraph, FAB, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../config/apiClient';

const PostsScreen = ({ navigation, route }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const theme = useTheme();

  // Fetch posts
  const fetchPosts = async () => {
    try {
      if (!refreshing) setLoading(true);
      const res = await apiClient.get('/posts');
      setPosts(res.data.posts || []);
    } catch (e) {
      console.error('Error fetching posts:', e.response?.data || e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (route.params?.refreshKey) fetchPosts();
    }, [route.params?.refreshKey])
  );

  // Toggle like
  const toggleLike = async (postId) => {
    setPosts(prev =>
      prev.map(p => {
        if (p._id !== postId) return p;

        const userLiked = p.likes?.some(like => like.user === user._id || like.user?._id === user._id);

        let updatedLikes;
        if (userLiked) {
          updatedLikes = p.likes.filter(like => (like.user?._id || like.user) !== user._id);
        } else {
          updatedLikes = [...(p.likes || []), { user: user._id }];
        }

        return { ...p, likes: updatedLikes };
      })
    );

    try {
      await apiClient.post(`/posts/${postId}/like`);
    } catch (e) {
      console.error('Error liking post:', e.response?.data || e.message);
      fetchPosts();
    }
  };

  // Delete post
  const deletePost = (postId) => {
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
            console.error('Error deleting post:', e.response?.data || e.message);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => {
    const isOwner = item.author?._id === user?._id;
    const isLiked = item.likes?.some(like => like.user === user._id || like.user?._id === user._id);
    const likesCount = item.likes?.length || 0;
    const commentsCount = item.comments?.length || 0;

    return (
      <Card style={styles.card}>
        <Card.Title
          title={item.author?.username || 'User'}
          subtitle={new Date(item.createdAt).toLocaleString()}
        />
        <Card.Content>
          {item.title ? <Title>{item.title}</Title> : null}
          <Paragraph>{item.content}</Paragraph>
        </Card.Content>

        <View style={styles.actions}>
          <TouchableOpacity onPress={() => toggleLike(item._id)} style={styles.actionButton}>
            <MaterialCommunityIcons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={22}
              color={isLiked ? '#E11D48' : '#64748B'}
            />
            <Text>{likesCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Comments', { postId: item._id })}
            style={styles.actionButton}
          >
            <MaterialCommunityIcons name="comment-outline" size={22} />
            <Text>{commentsCount}</Text>
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
        keyExtractor={i => i._id}
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
      <FAB icon="plus" style={styles.fab} onPress={() => navigation.navigate('CreatePost')} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { margin: 10, padding: 10 },
  fab: { position: 'absolute', bottom: 20, right: 20 },
  actions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 },
  actionButton: { alignItems: 'center' },
});

export default PostsScreen;
