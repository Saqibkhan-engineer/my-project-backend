import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {

  constructor(private readonly chatService: ChatService) {}

  @WebSocketServer()
  server: Server;

  // =========================
  // CONNECT
  // =========================
  handleConnection(client: Socket) {
    console.log(`🟢 Connected: ${client.id}`);
  }

  // =========================
  // DISCONNECT
  // =========================
  handleDisconnect(client: Socket) {
    console.log(`🔴 Disconnected: ${client.id}`);
  }

  // =========================
  // JOIN ROOM
  // =========================
  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @MessageBody() roomId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(roomId);

    console.log(`👥 Joined room: ${roomId}`);

    client.emit('joinedRoom', { roomId });

    return { event: 'joinedRoom', roomId };
  }

  // =========================
  // SEND MESSAGE (FIXED)
  // =========================
  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      console.log("📩 RAW MESSAGE:", data);

      // 🔥 VALIDATION FIX (IMPORTANT)
      if (!data?.roomId || !data?.message) {
        console.log("❌ Invalid payload");
        return;
      }

      // 🔥 SAFE DEFAULTS (PREVENT NULL ERROR)
      const messageData = {
        roomId: data.roomId,
        senderId: data.senderId || 0,
        senderName: data.senderName || "Unknown",
        senderRole: data.senderRole || "unknown",
        message: data.message,
      };

      // 1. SAVE IN DB
      const savedMessage = await this.chatService.saveMessage(messageData);

      console.log("💾 SAVED:", savedMessage);

      // 2. BROADCAST (REAL-TIME FIX)
      this.server.to(messageData.roomId).emit('receiveMessage', savedMessage);

      console.log(`💬 SENT TO ROOM: ${messageData.roomId}`);

      return savedMessage;

    } catch (error) {
      console.log('❌ CHAT ERROR:', error);

      client.emit('error', {
        message: 'Message not sent',
      });
    }
  }
}