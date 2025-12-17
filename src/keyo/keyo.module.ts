import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KeyoService } from './keyo.service';

@Module({
  imports: [ConfigModule],
  providers: [KeyoService],
  exports: [KeyoService],
})
export class KeyoModule {}

