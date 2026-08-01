import jwt from "jsonwebtoken";

export interface TokenPayload {
  sub: string;
  email: string;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
}

export function signToken(payload: TokenPayload, config: JwtConfig): string {
  return jwt.sign(payload, config.secret, {
    expiresIn: config.expiresIn as NonNullable<jwt.SignOptions["expiresIn"]>,
    algorithm: "HS256",
  });
}

export function verifyToken(
  token: string,
  secret: string,
): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, secret, { algorithms: ["HS256"] });

    if (
      typeof decoded !== "object" ||
      decoded === null ||
      typeof decoded.sub !== "string" ||
      typeof (decoded as jwt.JwtPayload & { email?: unknown }).email !== "string"
    ) {
      return null;
    }

    return {
      sub: decoded.sub,
      email: (decoded as jwt.JwtPayload & { email: string }).email,
    };
  } catch {
    return null;
  }
}
