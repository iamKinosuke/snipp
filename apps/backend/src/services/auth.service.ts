import { conflict, unauthorized } from "../errors/AppError.js";
import {
  DuplicateEmailError,
  type UserRepository,
} from "../repositories/user.repository.js";
import { signToken, type JwtConfig } from "../utils/jwt.js";
import {
  burnPasswordVerification,
  hashPassword,
  verifyPassword,
} from "../utils/password.js";

export interface AuthUser {
  id: string;
  email: string;
  createdAt: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export interface Credentials {
  email: string;
  password: string;
}

export interface AuthServiceDeps {
  repository: UserRepository;
  jwt: JwtConfig;
}

export interface AuthService {
  register(credentials: Credentials): Promise<AuthSession>;
  login(credentials: Credentials): Promise<AuthSession>;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function createAuthService(deps: AuthServiceDeps): AuthService {
  function toSession(user: {
    id: number;
    email: string;
    createdAt: Date;
  }): AuthSession {
    const id = String(user.id);
    return {
      token: signToken({ sub: id, email: user.email }, deps.jwt),
      user: { id, email: user.email, createdAt: user.createdAt.toISOString() },
    };
  }

  return {
    async register(credentials) {
      const email = normalizeEmail(credentials.email);
      const passwordHash = await hashPassword(credentials.password);

      try {
        const user = await deps.repository.create({ email, passwordHash });
        return toSession(user);
      } catch (error) {
        if (error instanceof DuplicateEmailError) {
          throw conflict(
            "EMAIL_TAKEN",
            "An account with this email already exists.",
          );
        }
        throw error;
      }
    },

    async login(credentials) {
      const email = normalizeEmail(credentials.email);
      const user = await deps.repository.findByEmail(email);

      if (user === null) {
        await burnPasswordVerification(credentials.password);
        throw unauthorized("Incorrect email or password.");
      }

      const valid = await verifyPassword(credentials.password, user.passwordHash);
      if (!valid) {
        throw unauthorized("Incorrect email or password.");
      }

      return toSession(user);
    },
  };
}
