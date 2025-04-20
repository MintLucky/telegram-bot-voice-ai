import { Injectable } from '@nestjs/common'
import { Context } from 'grammy'

@Injectable()
export class TelegramService {
	constructor() {
		// Initialize any necessary properties or services here
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
						console.log('qwfqwfqw')
						if (ctx?.chat?.id && progressMessageId) {
							console.log('1214124124')
							await ctx.api.editMessageText(
								ctx?.chat?.id,
								progressMessageId,
								this.renderProgress(percent)
							)
						}
					}
				},
				duration > 300 ? 3000 : 2000
			)

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
