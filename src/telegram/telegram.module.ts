import { NestjsGrammyModule } from "@grammyjs/nestjs";
import { TelegramUpdate } from "./telegram.update";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TelegramService } from "./telegram.service";


@Module({
  imports: [
    ConfigModule, 
    NestjsGrammyModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      // @ts-ignore
      useFactory: async (configService: ConfigService) => ({
        token: configService.get<string>('TELEGRAM_BOT_TOKEN'),
      })
    }),
  ],
  providers: [TelegramUpdate, TelegramService],
})

export class TelegramModule {}