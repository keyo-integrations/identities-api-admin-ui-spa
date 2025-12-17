import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IdentitiesModule } from './identities/identities.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    IdentitiesModule,
  ],
})
export class AppModule {}

