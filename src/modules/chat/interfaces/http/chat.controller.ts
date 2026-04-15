import { Body, Controller, Get, Post } from '@nestjs/common';
import { HandleChatMessageUseCase } from '../../application/use-cases/handle-chat-message.use-case';
import { GetPlaybackStateUseCase } from '../../application/use-cases/get-playback-state.use-case';
import { ChatMessageDto } from './chat-message.dto';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly handleChatMessageUseCase: HandleChatMessageUseCase,
    private readonly getPlaybackStateUseCase: GetPlaybackStateUseCase,
  ) {}

  @Post('messages')
  async sendMessage(@Body() body: ChatMessageDto) {
    // El controlador se mantiene fino: recibe HTTP y delega la logica.
    return this.handleChatMessageUseCase.execute(body.message);
  }

  @Get('state')
  async getState() {
    return this.getPlaybackStateUseCase.execute();
  }
}
