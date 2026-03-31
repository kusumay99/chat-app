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
      enum: ['text', 'image', 'document'],
      default: 'text',
    },

    text: {
      type: String,
      default: null,
    },

    fileUrl: String,
    fileName: String,
    fileSize: Number,

    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent',
    },

    deliveredAt: Date,
    readAt: Date,

    isEdited: {
      type: Boolean,
      default: false,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);