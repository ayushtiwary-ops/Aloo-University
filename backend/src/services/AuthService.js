import bcrypt  from 'bcrypt';
import jwt     from 'jsonwebtoken';
import { query }    from '../db/pool.js';
import { env }      from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export const AuthService = {
  /**
   * Verifies credentials and returns a signed JWT.
   *
   * @param   {string} email
   * @param   {string} password
   * @returns {Promise<{ token: string, user: { id, email, role } }>}
   */
  async login(email, password) {
    const { rows } = await query(
      'SELECT id, email, password_hash, role FROM users WHERE email = $1 LIMIT 1',
      [email.toLowerCase().trim()]
    );

    const user = rows[0];

    // Constant-time comparison even when user not found (prevents timing attacks)
    const hash  = user?.password_hash ?? '$2b$12$invalidhashpadding000000000000000000000000000000000000';
    const match = await bcrypt.compare(password, hash);

    if (!user || !match) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );

    return {
      token,
      user: { id: user.id, email: user.email, role: user.role },
    };
  },

  /**
   * Creates a new user (admin tooling / seed use only — not exposed as public API).
   */
  async createUser(email, password, role = 'user') {
    const SALT_ROUNDS = 12;
    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    const { rows } = await query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, email, role, created_at`,
      [email.toLowerCase().trim(), hash, role]
    );

    return rows[0];
  },
};
