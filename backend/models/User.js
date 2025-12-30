const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 3
    },

    email: {
      type: String,
      required: true,
      unique: true, // ✅ only unique field
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true
    },

    profileId: {
      type: Number,
      default: null // ✅ optional, NOT unique
    },

    avatar: { type: String, default: '' },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
      default: 'prefer_not_to_say'
    },
    onlineStatus: {
      type: String,
      enum: ['online', 'offline'],
      default: 'offline'
    },
    lastSeen: { type: Date, default: null },
    refreshToken: { type: String, default: null }
  },
  { timestamps: true }
);

// Hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model('User', userSchema);
