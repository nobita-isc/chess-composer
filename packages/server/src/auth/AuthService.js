/**
 * AuthService.js
 * Authentication logic: login, token generation, password hashing
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { userRepository } from '../users/UserRepository.js';

const BCRYPT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'chess-composer-dev-secret-change-in-production';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

if (!process.env.JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET not set. Using default secret. Set JWT_SECRET environment variable in production.');
}

export class AuthService {
  async login(username, password) {
    if (!username || !password) {
      return { success: false, error: 'Username and password are required' };
    }

    const user = userRepository.findByUsername(username);

    if (!user) {
      return { success: false, error: 'Invalid username or password' };
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      return { success: false, error: 'Invalid username or password' };
    }

    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      student_id: user.student_id
    };

    const accessToken = this.generateAccessToken(tokenPayload);
    const refreshToken = this.generateRefreshToken(tokenPayload);

    return {
      success: true,
      data: {
        access_token: accessToken,
        refresh_token: refreshToken,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          student_id: user.student_id
        }
      }
    };
  }

  generateAccessToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
  }

  generateRefreshToken(payload) {
    return jwt.sign({ ...payload, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return null;
    }
  }

  refreshAccessToken(refreshToken) {
    const decoded = this.verifyToken(refreshToken);

    if (!decoded || decoded.type !== 'refresh') {
      return { success: false, error: 'Invalid refresh token' };
    }

    const user = userRepository.findById(decoded.id);

    if (!user) {
      return { success: false, error: 'User no longer exists' };
    }

    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      student_id: user.student_id
    };

    const accessToken = this.generateAccessToken(tokenPayload);
    const newRefreshToken = this.generateRefreshToken(tokenPayload);

    return {
      success: true,
      data: {
        access_token: accessToken,
        refresh_token: newRefreshToken
      }
    };
  }

  async hashPassword(password) {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  async comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  validatePassword(password) {
    const errors = [];

    if (!password || password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (password && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (password && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (password && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const authService = new AuthService();
