import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { OPEN_AI_API } from '../../constants'
import axios from 'axios'
import {
	buildTimestampUserPrompt,
	TIMESTAMP_SYSTEM_PROMPT
} from '../prompts/timestamp.prompts'

interface IOpenAIResponse {
	choices: {
		message: {
			content: string
		}
	}[]
	usage: {
		prompt_tokens: number
		completion_tokens: number
	}
}

@Injectable()
export class AiService {
	private readonly openAiApiKey: string | undefined

	constructor(private readonly configService: ConfigService) {
		this.openAiApiKey = this.configService.get<string>('OPENAI_API_KEY')
	}

	async generateTimestamps(
		text: string,
		audioDurationSec: number
	): Promise<{ timestamps: string; cost: string }> {
		// Max number of logical segments to split the text
		const maxSegments = 10

		// Divide the text into words
		const words = text.split(/\s+/)

		const wordsPerSegment = Math.ceil(words.length / maxSegments)
		const secondsPerSegment = Math.floor(audioDurationSec / maxSegments)

		const segments: { time: string; content: string }[] = []

		for (let i = 0; i < maxSegments; i++) {
			// Calculate segment start time
			const fromSec = i * secondsPerSegment
			// Convert seconds to mm:ss format
			const fromMin = String(Math.floor(fromSec / 60)).padStart(2, '0')
			const fromSecRest = String(fromSec % 60).padStart(2, '0')
			const time = `${fromMin}:${fromSecRest}`

			// Calculate segment start and end indices
			const start = i * wordsPerSegment
			const end = start + wordsPerSegment
			const content = words.slice(start, end).join(' ')

			if (content.trim()) {
				segments.push({ time, content })
			}
		}

		const preparedText = segments.map(({ content }) => content).join('\n')

		const systemMessage = TIMESTAMP_SYSTEM_PROMPT
		const userMessage = buildTimestampUserPrompt(preparedText)

		const response = await axios.post<IOpenAIResponse>(
			`${OPEN_AI_API}/chat/completions`,
			{
				model: 'gpt-4o-mini',
				messages: [
					{
						role: 'system',
						content: systemMessage
					},
					{
						role: 'user',
						content: userMessage
					}
				],
				temperature: 0.3, // How “freely” the model thinks (0 - strictly, 1 - creatively)
				max_tokens: 300 // Limit the scope of the answer
			},
			{
				headers: {
					Authorization: `Bearer ${this.openAiApiKey}`
				}
			}
		)

		const result = response.data.choices[0].message.content
		const usage = response.data.usage

		const inputCost = (usage.prompt_tokens / 1_000_000) * 0.15
		const outputCost = (usage.completion_tokens / 1_000_000) * 0.6
		const total = inputCost + outputCost

		const costText = `💸 Cost of generation is: ~\$${total.toFixed(4)}`

		return {
			timestamps: result,
			cost: costText
		}
	}
}
