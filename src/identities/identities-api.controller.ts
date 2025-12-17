import { BadRequestException, Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { KeyoService } from '../keyo/keyo.service';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';

interface LoginDto {
  email?: string;
  password?: string;
}

@Controller('api')
export class IdentitiesApiController {
  constructor(
    private readonly keyoService: KeyoService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('token')
  async token(@Body() body: LoginDto) {
    const email = body?.email?.trim();
    const password = body?.password?.trim();

    // If email/password provided, validate credentials (login)
    if (email || password) {
      if (!email || !password) {
        throw new BadRequestException({
          message: 'email and password are required',
          code: 'IDENTITIES_CREDENTIALS_REQUIRED',
        });
      }

      const isValid = this.authService.validateUser(email, password);
      if (!isValid) {
        throw new UnauthorizedException({
          message: 'Invalid email or password',
          code: 'IDENTITIES_INVALID_CREDENTIALS',
        });
      }
    }
    // If no credentials provided, skip validation (refresh)

    try {
      const authToken = this.configService.get<string>('KEYO_AUTH_TOKEN');
      if (!authToken) {
        throw new BadRequestException({
          message: 'KEYO_AUTH_TOKEN not configured',
          code: 'IDENTITIES_CONFIG_ERROR',
        });
      }

      const tokenResponse = await this.keyoService.exchangeOrgToken(authToken);
      return {
        access_token: tokenResponse.accessToken,
        expires_in: tokenResponse.expiresIn,
        token_type: tokenResponse.tokenType,
        scope: tokenResponse.scope,
      };
    } catch (error: any) {
      throw new BadRequestException({
        message: 'Unable to exchange token with Keyo',
        detail: error?.message ?? null,
        code: 'IDENTITIES_TOKEN_EXCHANGE_FAILED',
      });
    }
  }
}

