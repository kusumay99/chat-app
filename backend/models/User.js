const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },

  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },

  password: {
    type: String,
    minlength: 6,
    required: function () {
      return !this.profileId; // password required only for normal users
    }
  },

  // External platform numeric profile id (OPTIONAL)
  profileId: {
    type: Number,
    index: true,
    default: null
  },

  avatar: {
    type: String,
    default: ''
  },

  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    default: 'prefer_not_to_say'
  },

  dateOfBirth: {
    type: Date,
    default: null
  },

  address: {
    type: String,
    default: '',
    maxlength: 200
  },

  onlineStatus: {
    type: String,
    enum: ['online', 'offline', 'away'],
    default: 'offline'
  },

  lastSeen: {
    type: Date,
    default: Date.now
  },

  refreshToken: {
    type: String,
    default: null
  }
}, { timestamps: true });

/* ===============================
   HASH PASSWORD (ONLY IF EXISTS)
================================ */
userSchema.pre('save', async function (next) {
  if (!this.password) return next();
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.comparePassword = function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.refreshToken;
  return user;
};

module.exports = mongoose.model('User', userSchema);
