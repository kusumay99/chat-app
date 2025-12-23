const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    messageType: {
      type: String,
      enum: ['text', 'image', 'document', 'audio', 'video'],
      default: 'text',
    },

    text: {
      type: String,
      required: function () {
        return this.messageType === 'text';
      },
      trim: true,
    },

    fileUrl: {
      type: String,
      default: null,
    },

    fileName: {
      type: String,
      default: null,
    },

    fileSize: {
      type: Number,
      default: null,
    },

    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent',
    },

    deliveredAt: {
      type: Date,
      default: null,
    },

    readAt: {
      type: Date,
      default: null,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/* ===========================
   Indexes (Performance)
=========================== */
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, status: 1 });

module.exports = mongoose.model('Message', messageSchema);
