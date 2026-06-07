import jwt from 'jsonwebtoken';

const SECRET: string = process.env.JWT_SECRET || 'secret_default_dev';
const EXPIRES: string = process.env.JWT_EXPIRES_IN || '1d';

export const generateToken = (payload: object): string => {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES } as jwt.SignOptions);
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, SECRET);
  } catch (error) {
    return null;
  }
};

export const decodeTokenUnsafe = (token: string) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
};