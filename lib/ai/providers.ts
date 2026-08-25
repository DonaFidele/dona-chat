import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';

// Client OpenAI redirigé vers la Vercel AI Gateway
const gatewayOpenAI = createOpenAI({
  apiKey: process.env.AI_GATEWAY_API_KEY,
  baseURL: 'https://ai-gateway.vercel.sh/v1',
});

export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
      },
    })
  : customProvider({
      languageModels: {
        'chat-model': gatewayOpenAI('openai/gpt-4o'),
        'chat-model-reasoning': wrapLanguageModel({
          model: gatewayOpenAI('openai/gpt-4-turbo'),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'title-model': gatewayOpenAI('openai/gpt-3.5-turbo'),
        'artifact-model': gatewayOpenAI('openai/gpt-3.5-turbo'),
      },
      imageModels: {
        'small-model': gatewayOpenAI.image('openai/dall-e-3'),
      },
      textEmbeddingModels: {
        'embedding-model': gatewayOpenAI.textEmbeddingModel('openai/text-embedding-3-small'),
      },
    });