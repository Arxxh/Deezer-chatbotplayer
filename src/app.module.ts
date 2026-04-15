import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatModule } from './modules/chat/chat.module';
import { HealthController } from './modules/system/interfaces/http/health.controller';

@Module({
  // ConfigModule queda global para que `ConfigService` este disponible
  // tanto en el bootstrap como en cualquier modulo futuro.
  imports: [ConfigModule.forRoot({ isGlobal: true }), ChatModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
