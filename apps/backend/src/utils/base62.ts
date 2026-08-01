import { randomInt } from "node:crypto";

export const BASE62_ALPHABET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const SHORT_CODE_LENGTH = 7;

export const SHORT_CODE_SPACE = BASE62_ALPHABET.length ** SHORT_CODE_LENGTH;

const BASE62_PATTERN = /^[0-9a-zA-Z]+$/;

export function generateShortCode(length: number = SHORT_CODE_LENGTH): string {
  if (!Number.isInteger(length) || length < 1) {
    throw new RangeError(`length must be a positive integer, received: ${length}`);
  }

  let code = "";
  for (let i = 0; i < length; i++) {
    code += BASE62_ALPHABET[randomInt(BASE62_ALPHABET.length)];
  }
  return code;
}

export function isBase62(value: string): boolean {
  return value.length > 0 && BASE62_PATTERN.test(value);
}
