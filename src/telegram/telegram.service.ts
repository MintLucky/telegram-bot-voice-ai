import { Injectable } from "@nestjs/common";
import { Context } from "grammy";

@Injectable()
export class TelegramService {
  constructor() {
    // Initialize any necessary properties or services here
  }

  processVoiceMessage(ctx: Context): void {
    const voiceMessage = ctx?.msg?.voice;
    const duration = voiceMessage?.duration;

    console.log('duration:', duration);
  }
}