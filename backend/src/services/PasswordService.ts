import bcryptjs from 'bcryptjs';

const SALT_ROUNDS = 10;

export class PasswordService {
  static async hash(password: string): Promise<string> {
    return bcryptjs.hash(password, SALT_ROUNDS);
  }

  static async verify(password: string, hash: string): Promise<boolean> {
    return bcryptjs.compare(password, hash);
  }
}
