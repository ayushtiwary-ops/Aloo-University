import bcrypt        from 'bcrypt';
import jwt           from 'jsonwebtoken';
import { query }     from '../db/pool.js';
import { env }       from '../config/env.js';
import { ApiError }  from '../utils/ApiError.js';

const SALT_ROUNDS = 12;

export const CandidateAuthService = {

  async register(full_name, email, phone, password) {
    const normalised = email.toLowerCase().trim();

    // Check for duplicate email
    const existing = await query(
      'SELECT id FROM candidates WHERE email = $1 LIMIT 1',
      [normalised]
    );
    if (existing.rows.length) {
      throw new ApiError(409, 'Email already registered');
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const { rows } = await query(
      `INSERT INTO candidates (full_name, email, phone, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email`,
      [full_name.trim(), normalised, phone.trim(), password_hash]
    );

    const candidate = rows[0];

    const token = jwt.sign(
      { id: candidate.id, role: 'candidate', email: candidate.email },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );

    return { token, user: { id: candidate.id, email: candidate.email, role: 'candidate' } };
  },

  async login(email, password) {
    const normalised = email.toLowerCase().trim();

    const { rows } = await query(
      'SELECT id, email, password_hash FROM candidates WHERE email = $1 LIMIT 1',
      [normalised]
    );

    const candidate = rows[0];

    // Constant-time comparison (prevents timing attacks)
    const hash  = candidate?.password_hash ?? '$2b$12$invalidhashpadding000000000000000000000000000000000000';
    const match = await bcrypt.compare(password, hash);

    if (!candidate || !match) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const token = jwt.sign(
      { id: candidate.id, role: 'candidate', email: candidate.email },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );

    return { token, user: { id: candidate.id, email: candidate.email, role: 'candidate' } };
  },
};
