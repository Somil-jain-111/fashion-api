import * as bcrypt from 'bcrypt';

export class PasswordHelper {
  static async comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  }
}
