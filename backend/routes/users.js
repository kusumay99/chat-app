const express = require('express');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

/* ======================================================
   MULTER CONFIG
====================================================== */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/avatars'),
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    cb(null, `${req.user._id}-${Date.now()}.${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    file.mimetype.startsWith('image/')
      ? cb(null, true)
      : cb(new Error('Only images allowed'));
  },
});

/* ======================================================
   GET ALL USERS
====================================================== */
router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;

    const query = {
      _id: { $ne: req.user._id },
      ...(search && {
        $or: [
          { username: new RegExp(search, 'i') },
          { email: new RegExp(search, 'i') },
        ],
      }),
    };

    const users = await User.find(query)
      .select('username email avatar onlineStatus lastSeen')
      .limit(20);

    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ======================================================
   GET PROFILE BY USER ID
====================================================== */
router.post(
  '/profile/by-user-id',
  auth,
  body('userId').isMongoId(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const user = await User.findById(req.body.userId).select(
        'profileId username email avatar gender dateOfBirth address onlineStatus lastSeen'
      );

      if (!user) return res.status(404).json({ message: 'User not found' });

      res.json({ profile: user });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

/* ======================================================
   GET PROFILE BY EMAIL  ✅ WORKING
====================================================== */
router.get(
  '/profile/by-email',
  auth,
  body('email').isEmail(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const email = req.body.email.toLowerCase().trim();

      const user = await User.findOne({ email }).select(
        'profileId username email avatar gender dateOfBirth address onlineStatus lastSeen'
      );

      if (!user) return res.status(404).json({ message: 'User not found' });

      res.json({ profile: user });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

/* ======================================================
   GET PROFILE BY PROFILE ID (BODY ONLY)
====================================================== */
router.get(
  '/profile/by-profileId',
  [
    body('profileId')
      .notEmpty()
      .isNumeric()
      .withMessage('profileId is required and must be numeric')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const profileId = Number(req.body.profileId);

      const user = await User.findOne({ profileId }).select(
        'profileId username email avatar gender dateOfBirth address onlineStatus lastSeen'
      );

      if (!user) {
        return res.status(404).json({
          message: 'Profile not found'
        });
      }

      res.json({
        profile: user
      });
    } catch (err) {
      console.error('Get profile by profileId error:', err);
      res.status(500).json({
        message: 'Server error'
      });
    }
  }
);

/* ======================================================
   UPDATE PROFILE
====================================================== */
router.put(
  '/profile',
  auth,
  [
    body('username').optional().isLength({ min: 3 }),
    body('gender').optional(),
    body('dateOfBirth').optional().isISO8601(),
    body('address').optional(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const user = await User.findById(req.user._id);

      Object.assign(user, req.body);
      await user.save();

      res.json({ message: 'Profile updated', user });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

/* ======================================================
   UPLOAD AVATAR
====================================================== */
router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: 'No file uploaded' });

    const user = await User.findById(req.user._id);
    user.avatar = `/uploads/avatars/${req.file.filename}`;
    await user.save();

    res.json({ avatar: user.avatar });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ======================================================
   UPDATE STATUS
====================================================== */
router.put('/status', auth, body('status').isIn(['online', 'offline', 'away']), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const user = await User.findById(req.user._id);
    user.onlineStatus = req.body.status;
    if (req.body.status === 'offline') user.lastSeen = new Date();
    await user.save();

    res.json({ status: user.onlineStatus });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/dummy', ()=>{
  consol.log('iammad')
})
module.exports = router;
