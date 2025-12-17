import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosRequestConfig } from 'axios';
import { KEYO_API_BASE } from '../config';

@Injectable()
export class KeyoService {
  private accessToken: string | null = null;
  private tokenExpiry = 0;
  private readonly logger = new Logger(KeyoService.name);

  constructor(private readonly configService: ConfigService) {}

  private async requestToken(authToken: string) {
    if (!authToken) {
      throw new Error('Keyo auth token is required');
    }

    const tokenUrl = `${KEYO_API_BASE}/v1/oauth/token/`;

    const res = await axios.post(
      tokenUrl,
      new URLSearchParams({ grant_type: 'client_credentials' }),
      {
        headers: {
          Authorization: `Basic ${authToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json; version=v2',
        },
      },
    );

    return {
      accessToken: res.data.access_token,
      expiresIn: res.data.expires_in,
      tokenType: res.data.token_type,
      scope: res.data.scope ?? null,
    };
  }

  private async auth(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiry) {
      this.logger.log('[KEYO AUTH] Using cached access token');
      return this.accessToken;
    }

    this.logger.log('[KEYO AUTH] Requesting new access token');

    const authToken = this.configService.get<string>('KEYO_AUTH_TOKEN');
    const tokenResponse = await this.requestToken(authToken);

    this.accessToken = tokenResponse.accessToken;
    this.tokenExpiry = now + tokenResponse.expiresIn * 1000 - 30000;
    this.logger.log('[KEYO AUTH] Access token received and cached');
    return this.accessToken;
  }

  async exchangeOrgToken(authToken: string) {
    return this.requestToken(authToken);
  }

  private async requestWithRetry(
    method: 'get' | 'patch',
    path: string,
    data: any = null,
    extraConfig: AxiosRequestConfig = {},
  ) {
    const makeRequest = async () => {
      const token = await this.auth();
      const url = `${KEYO_API_BASE}${path}`;
      this.logger.log(`[KEYO API] ${method.toUpperCase()} ${url}`);

      return axios.request({
        method,
        url,
        data,
        ...extraConfig,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json; version=v2',
          'Content-Type': 'application/json',
          ...(extraConfig.headers || {}),
        },
      });
    };

    try {
      return await makeRequest();
    } catch (err: any) {
      if (err.response?.status === 401) {
        this.logger.warn('[KEYO API] Access token expired. Retrying with new token.');
        this.accessToken = null;
        return await makeRequest();
      }
      this.logger.error('[KEYO API] Request failed:', err);
      throw err;
    }
  }

  async getUser(userId: string, key: string | null = null): Promise<any> {
    this.logger.log(`[KEYO SERVICE] Retrieving user object for userId: ${userId}`);
    const orgId = this.configService.get<string>('KEYO_ORG_ID');
    const res = await this.requestWithRetry('get', `/api/v3/public/organizations/${orgId}/members/${userId}/`);
    const data = res.data;

    if (!key) return data;

    const parts = key.split('.');
    let value = data;
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        this.logger.warn(`[KEYO SERVICE] Key path '${key}' not found. Returning full object.`);
        return data;
      }
    }

    this.logger.log(`[KEYO SERVICE] Retrieved value for key '${key}': ${value}`);
    return value;
  }

  async verifyUserJwt(jwt: string): Promise<any | false> {
    this.logger.log(`[KEYO SERVICE] Verifying user JWT`);
    
    try {
      // Call the profile endpoint with JWT in Authorization header
      await axios.get(
        `${KEYO_API_BASE}/api/v3/users/profile/`,
        {
          headers: {
            Authorization: `JWT ${jwt}`,
            Accept: 'application/json; version=v2',
            'Content-Type': 'application/json',
          },
        }
      );

      // If the request succeeds, the JWT is valid
      // Decode the JWT to extract the payload
      const decodedJwt = this.decodeJwt(jwt);
      
      this.logger.log(`[KEYO SERVICE] JWT verified successfully for user: ${decodedJwt.user_id}`);
      return decodedJwt;
      
    } catch (error: any) {
      if (error.response?.status === 401) {
        this.logger.warn(`[KEYO SERVICE] JWT verification failed: Unauthorized`);
        return false;
      }
      
      this.logger.error(`[KEYO SERVICE] JWT verification error:`, error.message);
      return false;
    }
  }

  private decodeJwt(jwt: string): any {
    try {
      // JWT format: header.payload.signature
      const parts = jwt.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      // Decode the payload (second part)
      const payload = parts[1];
      const decodedPayload = Buffer.from(payload, 'base64').toString('utf-8');
      
      return JSON.parse(decodedPayload);
    } catch (error) {
      this.logger.error(`[KEYO SERVICE] JWT decode error:`, error);
      throw new Error('Failed to decode JWT');
    }
  }
}

