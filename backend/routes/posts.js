const express = require('express');
const mongoose = require('mongoose');

const Post = require('../models/Post');
const User = require('../models/User');
const Counter = require('../models/Counter');
const auth = require('../middleware/auth');

const router = express.Router();

/* ======================================================
   HELPERS
====================================================== */
const isValidNumber = (val) => typeof val === 'number' && !isNaN(val);

const sendError = (res, status, message) =>
  res.status(status).json({ success: false, message });

const sendSuccess = (res, data, status = 200) =>
  res.status(status).json({ success: true, ...data });

/* ======================================================
   SEQUENTIAL POST ID
====================================================== */
const getNextPostId = async () => {
  const counter = await Counter.findOneAndUpdate(
    { name: 'postId' },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );
  return counter.value;
};

/* ======================================================
   CREATE POST
====================================================== */
router.post('/create', auth, async (req, res) => {
  try {
    let { title, description, content } = req.body;

    // ---------------------------
    // SANITIZE INPUT
    // ---------------------------
    title = typeof title === 'string' ? title.trim() : '';
    description = typeof description === 'string' ? description.trim() : '';
    content = typeof content === 'string' ? content.trim() : '';

    // ---------------------------
    // FALLBACK CONTENT
    // ---------------------------
    if (!content) {
      content = description;
    }

    // ---------------------------
    // VALIDATION
    // ---------------------------
    if (!title || title.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Title must be at least 3 characters',
      });
    }

    if (!content || content.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Content must be at least 10 characters',
      });
    }

    // ---------------------------
    // CREATE POST ID
    // ---------------------------
    const postId = await getNextPostId();

    // ---------------------------
    // CREATE POST IN DB
    // ---------------------------
    const newPost = await Post.create({
      postId,
      title,
      description,
      content,
      author: req.user._id,
      status: 'active',
    });

    // ---------------------------
    // POPULATE AUTHOR
    // ---------------------------
    const post = await Post.findById(newPost._id)
      .populate('author', 'username avatar')
      .lean();

    // ---------------------------
    // SUCCESS RESPONSE
    // ---------------------------
    return res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: {
        post,
      },
    });

  } catch (err) {
    console.error('❌ CREATE POST ERROR:', err);

    return res.status(500).json({
      success: false,
      message: 'Failed to create post',
    });
  }
});

/* ======================================================
   GET ALL POSTS
====================================================== */
router.post('/list', auth, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.body.page) || 1);
    const limit = Math.min(50, Number(req.body.limit) || 10);

    const posts = await Post.find({ status: 'active' })
      .populate('author', 'username avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Post.countDocuments({ status: 'active' });

    return sendSuccess(res, {
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('LIST ERROR:', err);
    return sendError(res, 500, 'Failed to fetch posts');
  }
});

/* ======================================================
   GET SINGLE POST (BY postId)
====================================================== */
router.post('/get-one', auth, async (req, res) => {
  try {
    const { postId } = req.body;

    if (!isValidNumber(postId)) {
      return sendError(res, 400, 'Invalid postId');
    }

    const post = await Post.findOne({ postId, status: 'active' })
      .populate('author', 'username avatar')
      .lean();

    if (!post) return sendError(res, 404, 'Post not found');

    return sendSuccess(res, { post });
  } catch (err) {
    console.error('GET ONE ERROR:', err);
    return sendError(res, 500, 'Failed to fetch post');
  }
});

/* ======================================================
   UPDATE POST
====================================================== */
router.put('/update', auth, async (req, res) => {
  try {
    const { postId, title, description, content } = req.body;

    if (!isValidNumber(postId)) {
      return sendError(res, 400, 'Invalid postId');
    }

    const post = await Post.findOne({ postId });

    if (!post || post.status !== 'active') {
      return sendError(res, 404, 'Post not found');
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return sendError(res, 403, 'Not authorized');
    }

    if (title !== undefined) post.title = title.trim();
    if (description !== undefined) post.description = description.trim();
    if (content?.trim()) post.content = content.trim();

    await post.save();
    await post.populate('author', 'username avatar');

    return sendSuccess(res, { post });
  } catch (err) {
    console.error('UPDATE ERROR:', err);
    return sendError(res, 500, 'Update failed');
  }
});

/* ======================================================
   DELETE POST (SOFT DELETE)
====================================================== */
router.put('/delete', auth, async (req, res) => {
  try {
    const { postId } = req.body;

    if (!isValidNumber(postId)) {
      return sendError(res, 400, 'Invalid postId');
    }

    const post = await Post.findOne({ postId });

    if (!post) return sendError(res, 404, 'Post not found');

    if (post.author.toString() !== req.user._id.toString()) {
      return sendError(res, 403, 'Not authorized');
    }

    post.status = 'deleted';
    await post.save();

    return sendSuccess(res, { message: 'Post deleted successfully' });
  } catch (err) {
    console.error('DELETE ERROR:', err);
    return sendError(res, 500, 'Delete failed');
  }
});

/* ======================================================
   LIKE / UNLIKE
====================================================== */
router.post('/like', auth, async (req, res) => {
  try {
    const { postId } = req.body;

    if (!isValidNumber(postId)) {
      return sendError(res, 400, 'Invalid postId');
    }

    const post = await Post.findOne({ postId });
    if (!post) return sendError(res, 404, 'Post not found');

    const userId = req.user._id;

    const alreadyLiked = post.likes.some(
      (l) => l.user.toString() === userId.toString()
    );

    if (alreadyLiked) {
      post.likes = post.likes.filter(
        (l) => l.user.toString() !== userId.toString()
      );
    } else {
      post.likes.push({ user: userId });
    }

    await post.save();

    return sendSuccess(res, {
      action: alreadyLiked ? 'unliked' : 'liked',
      likesCount: post.likes.length,
    });
  } catch (err) {
    console.error('LIKE ERROR:', err);
    return sendError(res, 500, 'Like failed');
  }
});

/* ======================================================
   ADD COMMENT
====================================================== */
router.post('/comment', auth, async (req, res) => {
  try {
    const { postId, text } = req.body;

    if (!isValidNumber(postId)) {
      return sendError(res, 400, 'Invalid postId');
    }

    if (!text?.trim()) {
      return sendError(res, 400, 'Comment text required');
    }

    const post = await Post.findOne({ postId });
    if (!post) return sendError(res, 404, 'Post not found');

    post.comments.push({
      user: req.user._id,
      text: text.trim(),
    });

    await post.save();

    return sendSuccess(res, { comments: post.comments });
  } catch (err) {
    console.error('COMMENT ERROR:', err);
    return sendError(res, 500, 'Comment failed');
  }
});

/* ======================================================
   DELETE COMMENT
====================================================== */
router.put('/delete-comment', auth, async (req, res) => {
  try {
    const { postId, commentId } = req.body;

    if (!isValidNumber(postId) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return sendError(res, 400, 'Invalid IDs');
    }

    const post = await Post.findOne({ postId });
    if (!post) return sendError(res, 404, 'Post not found');

    const comment = post.comments.id(commentId);
    if (!comment) return sendError(res, 404, 'Comment not found');

    if (
      comment.user.toString() !== req.user._id.toString() &&
      post.author.toString() !== req.user._id.toString()
    ) {
      return sendError(res, 403, 'Not authorized');
    }

    comment.deleteOne();
    await post.save();

    return sendSuccess(res, { message: 'Comment deleted' });
  } catch (err) {
    console.error('DELETE COMMENT ERROR:', err);
    return sendError(res, 500, 'Delete comment failed');
  }
});

/* ======================================================
   SAVE / UNSAVE POST
====================================================== */
router.post('/save', auth, async (req, res) => {
  try {
    const { postId } = req.body;

    if (!isValidNumber(postId)) {
      return sendError(res, 400, 'Invalid postId');
    }

    const user = await User.findById(req.user._id);

    if (!user.savedPosts) user.savedPosts = [];

    const exists = user.savedPosts.some(
      (id) => id.toString() === postId.toString()
    );

    if (exists) {
      user.savedPosts = user.savedPosts.filter(
        (id) => id.toString() !== postId.toString()
      );
    } else {
      user.savedPosts.push(postId);
    }

    await user.save();

    return sendSuccess(res, {
      action: exists ? 'unsaved' : 'saved',
    });
  } catch (err) {
    console.error('SAVE ERROR:', err);
    return sendError(res, 500, 'Save failed');
  }
});

/* ======================================================
   SEARCH POSTS
====================================================== */
router.post('/search', auth, async (req, res) => {
  try {
    const { query } = req.body;

    const posts = await Post.find({
      content: { $regex: query || '', $options: 'i' },
      status: 'active',
    })
      .limit(20)
      .populate('author', 'username avatar');

    return sendSuccess(res, { posts });
  } catch (err) {
    console.error('SEARCH ERROR:', err);
    return sendError(res, 500, 'Search failed');
  }
});

module.exports = router;