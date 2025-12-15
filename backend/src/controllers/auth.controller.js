// backend/src/controllers/auth.controller.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { config } from '../config/env.js';

export async function signup(req, res, next) {
  try {
    const { username, email, password } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'Email in use' });
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, passwordHash: hash });
    const token = jwt.sign({ id: user._id, email }, config.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, username, email } });
  } catch (e) { next(e); }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash)))
      return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, email }, config.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, username: user.username, email } });
  } catch (e) { next(e); }
}

export async function me(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select('_id username email');
    res.json({ user });
  } catch (e) { next(e); }
}
