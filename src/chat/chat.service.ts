import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/Message.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
  ) {}

  async saveMessage(data: any) {
    const message = this.messageRepo.create(data);
    return await this.messageRepo.save(message);
  }

  async getMessages(roomId: string) {
    return this.messageRepo.find({
      where: { roomId },
      order: { createdAt: 'ASC' },
    });
  }
}