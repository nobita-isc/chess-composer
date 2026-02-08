/**
 * UserService.js
 * Business logic for user management
 */

import { userRepository } from './UserRepository.js';
import { studentRepository } from '../students/StudentRepository.js';
import { authService } from '../auth/AuthService.js';

const VALID_ROLES = ['admin', 'student'];
const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,50}$/;

export class UserService {
  async createUser({ username, password, role, student_id = null }) {
    if (!username || !USERNAME_PATTERN.test(username)) {
      return {
        success: false,
        error: 'Username must be 3-50 characters and contain only letters, numbers, underscores, or hyphens'
      };
    }

    if (!VALID_ROLES.includes(role)) {
      return { success: false, error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` };
    }

    const passwordValidation = authService.validatePassword(password);
    if (!passwordValidation.valid) {
      return { success: false, error: passwordValidation.errors.join('. ') };
    }

    if (role === 'student') {
      if (!student_id) {
        return { success: false, error: 'Student accounts must be linked to a student record' };
      }

      const student = studentRepository.findById(student_id);
      if (!student) {
        return { success: false, error: 'Student record not found' };
      }

      const existingUser = userRepository.findByStudentId(student_id);
      if (existingUser) {
        return { success: false, error: `Student "${student.name}" already has an account (${existingUser.username})` };
      }
    }

    if (role === 'admin' && student_id) {
      return { success: false, error: 'Admin accounts cannot be linked to a student record' };
    }

    const passwordHash = await authService.hashPassword(password);

    return userRepository.create({
      username,
      password_hash: passwordHash,
      role,
      student_id
    });
  }

  getUserProfile(userId) {
    const user = userRepository.findById(userId);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    let studentInfo = null;
    if (user.student_id) {
      studentInfo = studentRepository.findById(user.student_id);
    }

    return {
      success: true,
      data: {
        ...user,
        student: studentInfo
      }
    };
  }

  async updateUser(id, data) {
    const existing = userRepository.findById(id);
    if (!existing) {
      return { success: false, error: 'User not found' };
    }

    const updateData = {};

    if (data.username !== undefined) {
      if (!USERNAME_PATTERN.test(data.username)) {
        return {
          success: false,
          error: 'Username must be 3-50 characters and contain only letters, numbers, underscores, or hyphens'
        };
      }
      updateData.username = data.username;
    }

    if (data.password !== undefined) {
      const passwordValidation = authService.validatePassword(data.password);
      if (!passwordValidation.valid) {
        return { success: false, error: passwordValidation.errors.join('. ') };
      }
      updateData.password_hash = await authService.hashPassword(data.password);
    }

    if (data.role !== undefined) {
      if (!VALID_ROLES.includes(data.role)) {
        return { success: false, error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` };
      }
      updateData.role = data.role;
    }

    if (data.student_id !== undefined) {
      if (data.student_id !== null) {
        const student = studentRepository.findById(data.student_id);
        if (!student) {
          return { success: false, error: 'Student record not found' };
        }

        const existingUser = userRepository.findByStudentId(data.student_id);
        if (existingUser && existingUser.id !== id) {
          return { success: false, error: 'This student already has an account' };
        }
      }
      updateData.student_id = data.student_id;
    }

    return userRepository.update(id, updateData);
  }

  deleteUser(id) {
    const user = userRepository.findById(id);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (user.username === 'admin') {
      return { success: false, error: 'Cannot delete the default admin account' };
    }

    return userRepository.delete(id);
  }

  getAllUsers() {
    return userRepository.findAll();
  }
}

export const userService = new UserService();
