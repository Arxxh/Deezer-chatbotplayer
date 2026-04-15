import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get()
  root() {
    return {
      name: 'deezer-chat-backend',
      version: '0.1.0',
      basePath: '/api/v1',
      routes: {
        health: '/api/v1/health',
        chatMessage: '/api/v1/chat/messages',
        chatState: '/api/v1/chat/state',
        playlists: '/api/v1/playlists',
      },
    };
  }

  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'deezer-chat-backend',
    };
  }
}
