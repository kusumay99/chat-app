const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true, minlength: 3 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: function() { return !this.profileId; } },
    profileId: { type: Number, unique: true, required: true, index: true }, // ✅ always required
    avatar: { type: String, default: '' },
    gender: { type: String, enum: ['male','female','other','prefer_not_to_say'], default: 'prefer_not_to_say' },
    dateOfBirth: { type: Date, default: null },
    address: { type: String, default: '' },
    onlineStatus: { type: String, enum: ['online','offline'], default: 'offline' },
    lastSeen: { type: Date, default: null },
    refreshToken: { type: String, default: null }
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (this.profileId && !this.password) return next(); // external auth
  if (!this.password) return next();
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = function(plainPassword) {
  if (!this.password) return false;
  return bcrypt.compare(plainPassword, this.password);
};

// Remove sensitive data in JSON responses
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
