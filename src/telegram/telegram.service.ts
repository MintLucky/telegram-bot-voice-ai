import { InjectBot } from '@grammyjs/nestjs'
import { Injectable } from '@nestjs/common'
import { Api, Bot, Context } from 'grammy'
import { ConfigService } from '@nestjs/config'
import { SpeechService } from '../services/speech.service'
import { AiService } from 'src/services/ai.service'

const showTimeCodesFromSec = 120
const notShowTextFromSec = 600

@Injectable()
export class TelegramService {
	private readonly botToken: string | undefined

	constructor(
		@InjectBot()
		private readonly bot: Bot<Context>,
		private readonly configService: ConfigService,
		private readonly speechService: SpeechService,
		private readonly aiService: AiService
	) {
		this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN')
	}

	async processVoiceMessage(ctx: Context): Promise<void> {
		const voiceMessage = ctx?.msg?.voice
		const chatId = ctx?.chat?.id
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

			if (chatId && progressMessageId) {
				interval = setInterval(
					async () => {
						if (percent < 90) {
							percent += 5
							await this.updateProgress(
								ctx.api,
								chatId,
								// @ts-ignore
								progressMessageId,
								percent
							)
						}
					},
					duration < 120 ? 700 : 2000
				)

				// Get the text from the voice message
				const transcription = file?.file_path
					? await this.speechService.transcribeAudio(file.file_path)
					: ''

				// Show the full text only if the audio is less than 3 minutes
				if (duration < notShowTextFromSec) {
					await ctx.reply(transcription)

					// Show 100% progress here because timestamps are not needed
					if (duration <= showTimeCodesFromSec) {
						// Show 100% progress
						this.updateProgressToFull(ctx.api, chatId, progressMessageId)
					}
				}

				if (duration > showTimeCodesFromSec) {
					// Get time from the text with time-codes and description of
					// the main idea of each segment
					const { cost, timestamps } = await this.aiService.generateTimestamps(
						transcription,
						duration
					)
					// Show 100% progress
					this.updateProgressToFull(ctx.api, chatId, progressMessageId)
					// Show the time-codes
					await ctx.reply(`⏳ Time-codes:\n\n${timestamps}`)
					await ctx.reply(cost)
				}
			}

			clearInterval(interval)
		} catch (error) {
			clearInterval(interval)
			console.error('Error processing voice message:', error.message)
			await ctx.reply(
				'An error occurred while processing your voice message. Please try again later.'
			)
		} finally {
			if (interval) {
				clearInterval(interval)
			}
		}
	}

	private async updateProgressToFull(
		api: Api,
		chatId: number,
		messageId: number
	) {
		this.updateProgress(api, chatId, messageId, 100)
		setTimeout(async () => {
			await api.deleteMessage(chatId, messageId)
		}, 1000)
	}

	private async updateProgress(
		api: Api,
		chatId: number,
		messageId: number,
		percent: number
	) {
		await api.editMessageText(chatId, messageId, this.renderProgress(percent))
	}

	private renderProgress(percent: number): string {
		const totalBlocks = 10
		const filledBlockChar = '#'
		const emptyBlockChar = '.'

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
