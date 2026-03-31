const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/* ============================================
   USER SCHEMA
   - Defines all user-related data
   - Supports OTP, sequential profileId, tokens, and profile info
============================================ */
const userSchema = new mongoose.Schema(
  {
    /* ===============================
       BASIC INFO
    =============================== */
    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      default: 'User',
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [
        /^\w+([\.+-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/,
        'Please provide a valid email address',
      ],
    },

    password: {
      type: String,
      default: null, // Allows OTP users without password initially
      minlength: [6, 'Password must be at least 6 characters'],
    },

    /* ===============================
       UNIQUE SEQUENTIAL USER ID
    =============================== */
    profileId: {
      type: Number,
      unique: true,
      sparse: true, // allows null initially
    },

    /* ===============================
       OTP VERIFICATION SYSTEM
    =============================== */
    otp: {
      type: String,
      default: null,
    },
    otpExpires: {
      type: Date,
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },

    /* ===============================
       PROFILE DETAILS
    =============================== */
    avatar: {
      type: String,
      default: '',
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
      default: 'prefer_not_to_say',
    },
    preferredLanguage: {
      type: String,
      default: 'en',
    },
    statusMessage: {
      type: String,
      default: '',
      maxlength: [200, 'Status message too long'],
    },
    savedPosts: {
      type: [Number],
      default: [],
    },
    address: {
      type: String,
      default: '',
    },
    contactNumber: {
      type: String,
      default: '',
    },

    /* ===============================
       USER PRESENCE
    =============================== */
    onlineStatus: {
      type: String,
      enum: ['online', 'offline', 'away', 'busy'],
      default: 'offline',
    },
    lastSeen: {
      type: Date,
      default: null,
    },

    /* ===============================
       AUTH TOKENS
    =============================== */
    refreshToken: {
      type: String,
      default: null,
    },

    /* ===============================
       AI / TRANSLATION CACHE (Future Use)
    =============================== */
    translatedMessages: [
      {
        original: { type: String },
        translated: { type: String },
        targetLang: { type: String },
      },
    ],
  },
  {
    timestamps: true,
  }
);

/* ============================================
   PASSWORD HASHING
   - Automatically hashes password before saving
============================================ */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();

  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (err) {
    next(err);
  }
});

/* ============================================
   INSTANCE METHOD: PASSWORD COMPARISON
   - Compares entered password with hashed password
============================================ */
userSchema.methods.comparePassword = async function (enteredPassword) {
  if (!this.password) return false;
  return bcrypt.compare(enteredPassword, this.password);
};

/* ============================================
   INSTANCE METHOD: CLEAN JSON OUTPUT
   - Removes sensitive info when sending user data
============================================ */
userSchema.methods.toJSON = function () {
  const obj = this.toObject();

  delete obj.password;
  delete obj.refreshToken;
  delete obj.otp;
  delete obj.otpExpires;
  delete obj.__v;

  return obj;
};

/* ============================================
   MODEL EXPORT
============================================ */
const User = mongoose.model('User', userSchema);
module.exports = User;