import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(private readonly configService: ConfigService) {}

  validateUser(email: string, password: string): boolean {
    const usersJson = this.configService.get<string>('USERS');
    
    if (!usersJson) {
      throw new UnauthorizedException('User configuration not found');
    }

    let users: Record<string, string>;
    try {
      users = JSON.parse(usersJson);
    } catch (error) {
      throw new UnauthorizedException('Invalid USERS configuration format');
    }

    if (typeof users !== 'object' || users === null) {
      throw new UnauthorizedException('USERS must be a JSON object');
    }

    const userPassword = users[email];
    if (!userPassword || userPassword !== password) {
      return false;
    }

    return true;
  }
}

