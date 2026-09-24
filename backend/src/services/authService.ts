import bcrypt from "bcryptjs";
import { pool } from "../config/db";
import { signToken } from "../utils/jwt";
import { SignupInput, LoginInput } from "../utils/validation";
import { User } from "../types";

const SALT_ROUNDS = 10;

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export async function signup(input: SignupInput): Promise<{ token: string; user: Omit<User, "password_hash"> }> {
  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [input.email]);
  if (existing.rows.length > 0) {
    throw new AuthError("An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const result = await pool.query<User>(
    `INSERT INTO users (email, password_hash, role, name)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, password_hash, role, name, created_at`,
    [input.email, passwordHash, input.role, input.name]
  );

  const user = result.rows[0];
  const token = signToken({ userId: user.id, role: user.role });

  const { password_hash, ...safeUser } = user;
  return { token, user: safeUser };
}

export async function login(input: LoginInput): Promise<{ token: string; user: Omit<User, "password_hash"> }> {
  const result = await pool.query<User>("SELECT * FROM users WHERE email = $1", [input.email]);
  const user = result.rows[0];

  // Deliberately identical error for "no such user" and "wrong password" —
  // this prevents leaking which emails are registered.
  if (!user) {
    throw new AuthError("Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(input.password, user.password_hash);
  if (!passwordMatches) {
    throw new AuthError("Invalid email or password");
  }

  const token = signToken({ userId: user.id, role: user.role });

  const { password_hash, ...safeUser } = user;
  return { token, user: safeUser };
}

export async function getUserById(userId: string): Promise<Omit<User, "password_hash"> | null> {
  const result = await pool.query<User>(
    "SELECT id, email, password_hash, role, name, created_at FROM users WHERE id = $1",
    [userId]
  );
  if (result.rows.length === 0) return null;

  const { password_hash, ...safeUser } = result.rows[0];
  return safeUser;
}
