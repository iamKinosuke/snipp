import { Prisma, type PrismaClient } from "@prisma/client";

export interface UserRecord {
  id: number;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export class DuplicateEmailError extends Error {
  constructor(readonly email: string) {
    super(`email already exists: ${email}`);
    this.name = "DuplicateEmailError";
  }
}

export interface UserRepository {
  create(data: { email: string; passwordHash: string }): Promise<UserRecord>;
  findByEmail(email: string): Promise<UserRecord | null>;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export function createUserRepository(client: PrismaClient): UserRepository {
  return {
    async create(data) {
      try {
        return await client.user.create({ data });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new DuplicateEmailError(data.email);
        }
        throw error;
      }
    },

    async findByEmail(email) {
      return await client.user.findUnique({ where: { email } });
    },
  };
}
