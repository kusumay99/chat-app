const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const auth = require('../middleware/auth');

/* ======================================================
   HELPERS
====================================================== */
const errorResponse = (res, message, code = 400) =>
  res.status(code).json({ success: false, message });

/* ======================================================
   GET ALL POSTS
   body: { page, limit }
====================================================== */
router.post('/list', auth, async (req, res) => {
  try {
    const page = Number(req.body.page) || 1;
    const limit = Number(req.body.limit) || 10;
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      Post.find({ status: 'active' })
        .populate('author', 'username avatar')
        .populate('likes.user', 'username')
        .populate('comments.user', 'username avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Post.countDocuments({ status: 'active' })
    ]);

    res.json({
      success: true,
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    console.error('Get posts error:', err);
    errorResponse(res, 'Failed to fetch posts', 500);
  }
});

/* ======================================================
   GET MY POSTS
   body: {}
====================================================== */
router.post('/my-posts', auth, async (req, res) => {
  try {
    const posts = await Post.find({
      author: req.user.id,
      status: 'active'
    })
      .populate('author', 'username avatar')
      .populate('likes.user', 'username')
      .populate('comments.user', 'username avatar')
      .sort({ createdAt: -1 });

    res.json({ success: true, posts });
  } catch (err) {
    console.error(err);
    errorResponse(res, 'Failed to fetch user posts', 500);
  }
});

/* ======================================================
   CREATE POST
   body: { title, description, content }
====================================================== */
router.post('/create', auth, async (req, res) => {
  try {
    const { title, description, content } = req.body;
    const finalContent = content || description;

    if (!finalContent || !finalContent.trim()) {
      return errorResponse(res, 'Post content is required');
    }

    const post = await Post.create({
      title: title?.trim(),
      description: description?.trim(),
      content: finalContent.trim(),
      author: req.user.id
    });

    await post.populate('author', 'username avatar');

    res.status(201).json({ success: true, post });
  } catch (err) {
    console.error(err);
    errorResponse(res, 'Failed to create post', 500);
  }
});

/* ======================================================
   UPDATE POST
   body: { postId, title, description, content }
====================================================== */
router.put('/update', auth, async (req, res) => {
  try {
    const { postId, title, description, content } = req.body;

    if (!postId) return errorResponse(res, 'postId is required');

    const post = await Post.findById(postId);
    if (!post) return errorResponse(res, 'Post not found', 404);

    if (post.author.toString() !== req.user.id) {
      return errorResponse(res, 'Not authorized', 403);
    }

    if (content?.trim()) post.content = content.trim();
    else if (description?.trim()) post.content = description.trim();

    if (title !== undefined) post.title = title?.trim();
    if (description?.trim()) post.description = description.trim();

    await post.save();
    await post.populate('author', 'username avatar');

    res.json({ success: true, post });
  } catch (err) {
    console.error(err);
    errorResponse(res, 'Failed to update post', 500);
  }
});

/* ======================================================
   DELETE POST (SOFT DELETE)
   body: { postId }
====================================================== */
router.put('/delete', auth, async (req, res) => {
  try {
    const { postId } = req.body;

    if (!postId) return errorResponse(res, 'postId is required');

    const post = await Post.findById(postId);
    if (!post) return errorResponse(res, 'Post not found', 404);

    if (post.author.toString() !== req.user.id) {
      return errorResponse(res, 'Not authorized', 403);
    }

    post.status = 'deleted';
    await post.save();

    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (err) {
    console.error(err);
    errorResponse(res, 'Failed to delete post', 500);
  }
});

/* ======================================================
   LIKE / UNLIKE POST
   body: { postId }
====================================================== */
router.post('/like', auth, async (req, res) => {
  try {
    const { postId } = req.body;
    if (!postId) return errorResponse(res, 'postId is required');

    const post = await Post.findById(postId);
    if (!post) return errorResponse(res, 'Post not found', 404);

    const liked = post.likes.some(
      like => like.user.toString() === req.user.id
    );

    post.likes = liked
      ? post.likes.filter(like => like.user.toString() !== req.user.id)
      : [...post.likes, { user: req.user.id }];

    await post.save();
    await post.populate('likes.user', 'username');

    res.json({
      success: true,
      action: liked ? 'unliked' : 'liked',
      likesCount: post.likes.length,
      likes: post.likes
    });
  } catch (err) {
    console.error(err);
    errorResponse(res, 'Failed to like post', 500);
  }
});

/* ======================================================
   ADD COMMENT
   body: { postId, text }
====================================================== */
router.post('/comment', auth, async (req, res) => {
  try {
    const { postId, text } = req.body;

    if (!postId) return errorResponse(res, 'postId required');
    if (!text?.trim()) return errorResponse(res, 'Comment text required');

    const post = await Post.findById(postId);
    if (!post) return errorResponse(res, 'Post not found', 404);

    post.comments.push({
      user: req.user.id,
      text: text.trim()
    });

    await post.save();
    await post.populate('comments.user', 'username avatar');

    res.json({ success: true, comments: post.comments });
  } catch (err) {
    console.error(err);
    errorResponse(res, 'Failed to add comment', 500);
  }
});

/* ======================================================
   DELETE COMMENT
   body: { postId, commentId }
====================================================== */
router.put('/delete-comment', auth, async (req, res) => {
  try {
    const { postId, commentId } = req.body;

    if (!postId || !commentId) {
      return errorResponse(res, 'postId and commentId required');
    }

    const post = await Post.findById(postId);
    if (!post) return errorResponse(res, 'Post not found', 404);

    const comment = post.comments.id(commentId);
    if (!comment) return errorResponse(res, 'Comment not found', 404);

    if (
      comment.user.toString() !== req.user.id &&
      post.author.toString() !== req.user.id
    ) {
      return errorResponse(res, 'Not authorized', 403);
    }

    post.comments.pull(commentId);
    await post.save();

    res.json({ success: true, message: 'Comment deleted' });
  } catch (err) {
    console.error(err);
    errorResponse(res, 'Failed to delete comment', 500);
  }
});

module.exports = router;
