import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
import { OPEN_AI_API, TELEGRAM_API } from '../../constants'
import * as FormData from 'form-data'

@Injectable()
export class SpeechService {
	private readonly botToken: string | undefined
	protected readonly openAiApiKey: string | undefined

	constructor(private readonly configService: ConfigService) {
		this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN')
		this.openAiApiKey = this.configService.get<string>('OPENAI_API_KEY')
	}

	async transcribeAudio(filePath: string): Promise<string> {
		const fileUrl = `${TELEGRAM_API}/file/bot${this.botToken}/${filePath}`
		const fileResponse = await axios.get(fileUrl, {
			// Type stream is important for large files
			responseType: 'stream'
		})

		const formData = new FormData()
		formData.append('file', fileResponse.data, {
			filename: 'audio.ogg'
		})
		formData.append('model', 'whisper-1')

		const response = await axios.post<{ text: string }>(
			`${OPEN_AI_API}/audio/transcriptions`,
			formData,
			{
				headers: {
					Authorization: `Bearer ${this.openAiApiKey}`,
					...formData.getHeaders()
				}
			}
		)

    return response.data.text
	}
}
