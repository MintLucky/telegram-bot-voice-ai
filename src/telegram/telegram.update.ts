import { InjectBot, On, Start, Update } from "@grammyjs/nestjs";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Bot, Context } from "grammy";
import { TelegramService } from "./telegram.service";

@Update()
@Injectable()
export class TelegramUpdate {
  constructor(private readonly telegramService: TelegramService) {}

  @Start()
  async onStart(ctx: Context): Promise<void> {
    await ctx.reply('Welcome to the bot! Send me a voice message and I will make timecodes for you baby ;)');
  }

  @On('message:voice')
  async onVoiceMessage(ctx: Context): Promise<void> {
    return this.telegramService.processVoiceMessage(ctx);
  }
}
  