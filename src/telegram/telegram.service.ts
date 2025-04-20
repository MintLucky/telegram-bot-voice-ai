import { InjectBot } from '@grammyjs/nestjs'
import { Injectable } from '@nestjs/common'
import { Bot, Context } from 'grammy'
import { ConfigService } from '@nestjs/config'
import { SpeechService } from '../services/speech.service'

@Injectable()
export class TelegramService {
	private readonly botToken: string | undefined

	constructor(
		@InjectBot()
		private readonly bot: Bot<Context>,
		private readonly configService: ConfigService,
		private readonly speechService: SpeechService
	) {
		this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN')
	}

	async processVoiceMessage(ctx: Context): Promise<void> {
		const voiceMessage = ctx?.msg?.voice
		const duration = voiceMessage?.duration || 0

		let progressMessageId: number | undefined
		let interval: NodeJS.Timeout | undefined
		let percent: number = 10

		try {
			const file = await ctx.getFile()
			await ctx.reply(
				'Duration of the voice message is: ' + duration + ' seconds'
			)

			const progressMessage = await ctx.reply(this.renderProgress(percent))
			progressMessageId = progressMessage.message_id

			interval = setInterval(
				async () => {
					if (percent < 90) {
						percent += 5
						if (ctx?.chat?.id && progressMessageId) {
							await ctx.api.editMessageText(
								ctx?.chat?.id,
								progressMessageId,
								this.renderProgress(percent)
							)
						}
					}
				},
				duration < 300 ? 500 : 2000
			)

			const transcription = file?.file_path ? await this.speechService.transcribeAudio(
				file.file_path
			) : null

      
      transcription && await ctx.reply(transcription).then(() => {
        
      }).finally(() => {
        if (progressMessageId && ctx?.chat?.id) {
          ctx.api.deleteMessage(ctx.chat.id, progressMessageId)
        }
        clearInterval(interval)
      })

      console.log('transcription:', transcription)

			// clearInterval(interval)
		} catch (error) {
			clearInterval(interval)
			console.error('Error processing voice message:', error.message)
			await ctx.reply(
				'An error occurred while processing your voice message. Please try again later.'
			)
		} finally {
			if (interval) {
				// clearInterval(interval)
			}
		}

		console.log('duration:', duration)
	}

	private renderProgress(percent: number): string {
		const totalBlocks = 10
		const filledBlockChar = '#'
		const emptyBlockChar = '.'

		console.log('percent:', percent)

		const filledBlocks = Math.max(1, Math.floor((percent / 100) * totalBlocks))

		const emptyBlocks = totalBlocks - filledBlocks

		return (
			'Progress: [' +
			filledBlockChar.repeat(filledBlocks) +
			emptyBlockChar.repeat(emptyBlocks) +
			'] ' +
			percent +
			'%'
		)
	}
}
