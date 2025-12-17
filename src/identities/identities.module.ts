import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IdentitiesUiController } from './identities-ui.controller';
import { IdentitiesApiController } from './identities-api.controller';
import { IdentitiesUiService } from './identities-ui.service';
import { AuthService } from './auth.service';
import { KeyoModule } from '../keyo/keyo.module';

@Module({
  imports: [ConfigModule, KeyoModule],
  controllers: [IdentitiesUiController, IdentitiesApiController],
  providers: [IdentitiesUiService, AuthService],
})
export class IdentitiesModule {}

