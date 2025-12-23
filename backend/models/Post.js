const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      maxlength: 100,
      default: ''
    },

    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ''
    },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    likes: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],

    comments: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        text: {
          type: String,
          required: true,
          trim: true,
          maxlength: 500
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],

    status: {
      type: String,
      enum: ['active', 'archived', 'deleted'],
      default: 'active'
    }
  },
  {
    timestamps: true
  }
);

// ✅ Indexes (good for feeds & profile posts)
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);
