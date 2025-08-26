import OpenAI from 'openai';
import { MessageService } from './messageService';
import { AssistantPrompt, decideResearchPrompt, EvaluationPrompt } from '../utils/prompts';
import { performResearchAsync } from '../utils/researchHelper';
import { logger } from '../utils/logger';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const fallbackResponse = {
  response: 'Sorry, I cannot answer that question. I can only answer questions related to utilities and billing.',
  confidence_score: 0,
  citations: []
};

export type MessageRole = 'user' | 'assistant' | 'system';

export type Message = {
  role: MessageRole;
  content: string;
}

export interface ChatRequest {
  messages: Array<Message>;
  userLocation?: string;
}

export interface ChatResponse {
  success: boolean;
  response: {
    response: string;
    confidence_score: number;
    citations: any[];
  };
  message_id: string;
  research_pending: boolean;
  timestamp: string;
}

export class ChatService {
  /**
   * Process a chat request
   */
  static async processChatRequest(
    request: ChatRequest,
    userId: string,
    sessionId?: string,
  ): Promise<ChatResponse> {
    const { messages, userLocation } = request;
    const userLastMessage = messages[messages.length - 1].content;
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Save user message to database
      await MessageService.createUserMessage(
        messageId,
        userLastMessage,
        sessionId,
        userId
      );

      logger.info(`Processing chat request with ${messages.length} messages`);
      let responseJson: any = null;
      let needsResearch = false;

      // Get initial assistant response
      // const response = await openai.chat.completions.create({
      //   model: "gpt-4o",
      //   messages: [
      //     {
      //       role: "system",
      //       content: AssistantPrompt,
      //     },
      //     ...messages,
      //   ],
      //   response_format: { type: "json_object" },
      // });

      // const responseText = response.choices[0].message.content;

      // if (!responseText) {
      //   // No answer, so research it
      //   needsResearch = true;
      //   responseJson = {
      //     response: "I'm looking into that for you. Let me search for the most current information",
      //     confidence_score: 0,
      //     citations: []
      //   };
      // } else {
      //   // Parse the response text to json
      //   const parsedResponse = JSON.parse(responseText);
      //   responseJson = parsedResponse;
      //   logger.info(`Received OpenAI response with confidence: ${parsedResponse.confidence_score}`);
        
      //   // Evaluate the response quality
      //   const messagesToEvaluate: ChatCompletionMessageParam = {
      //     role: "user",
      //     content: `Response: ${responseText}\nQuery: ${userLastMessage}`,
      //   };
        
      //   const evaluationResponse = await openai.chat.completions.create({
      //     model: "gpt-4o",
      //     messages: [
      //       {
      //         role: "system",
      //         content: EvaluationPrompt,
      //       },
      //       messagesToEvaluate,
      //     ],
      //     response_format: { type: "json_object" },
      //   });
        
      //   const evaluationResponseText = evaluationResponse.choices[0].message.content;
      //   if (evaluationResponseText) {
      //     logger.info(`Received OpenAI evaluation response: ${evaluationResponseText}`);
      //     const evaluationResponseJson = JSON.parse(evaluationResponseText);
      //     logger.info(`Received OpenAI evaluation response: ${evaluationResponseJson.evaluation.needs_research}`);
          
      //     if (evaluationResponseJson.evaluation.needs_research) {
      //       needsResearch = true;
      //       // Enhance the response to indicate research is starting
      //       responseJson.response = "To provide you with the most accurate and up-to-date information on your query, I'm now accessing the latest sources. This will allow me to give you a more comprehensive and reliable answer";
      //     }
      //   }
      // }

      // deep searching always, this part above is just in case you guys want to have a assistant 
      // that does not do research, so it can answer about common questions without doing research

      const response = await openai.responses.create({
        prompt: {
          id: process.env.ASSISTANT_PROMPT_ID!,
        },
        input: userLastMessage,
      });
      

      //logger.info(JSON.stringify(response, null, 2));
      const responseText = response.output_text;

      responseJson = JSON.parse(responseText || '{"research": false}');
      needsResearch = responseJson.research;
      if (!needsResearch) {
        responseJson = fallbackResponse;
        return {
          success: true,
          response: fallbackResponse,
          message_id: messageId,
          research_pending: needsResearch,
          timestamp: new Date().toISOString(),
        };
      } else {
        responseJson = {
          response: "To provide you with the most accurate and up-to-date information on your query, I'm now accessing the latest sources. This will allow me to give you a more comprehensive and reliable answer",
          confidence_score: 0,
          citations: []
        };
      }
       
      // Save bot message to database
      const botMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await MessageService.createBotMessage(
        botMessageId,
        responseJson.response,
        {
          confidence_score: responseJson.confidence_score,
          citations: [],
          original_response: responseJson
        },
        sessionId,
        userId
      );

      // If research is needed, start it asynchronously
      if (needsResearch) {
        //get all the messages in the conversation
        const allMessages: Message[] = [...messages, { role: 'assistant', content: responseJson.response }];
        // Don't await this - let it run in the background
        performResearchAsync(messageId, allMessages, userId, userLocation).catch(error => {
          logger.error(`Background research failed for ${messageId}:`, error);
        });
      }

      // Return the immediate response
      return {
        success: true,
        response: responseJson,
        message_id: messageId,
        research_pending: needsResearch,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Error in chat service:', error);
      
      // Handle OpenAI specific errors
      let errorMessage = 'An error occurred while processing your request.';
      if (error instanceof OpenAI.APIError) {
        if (error.status === 429) {
          errorMessage = 'Rate limit exceeded. Please try again later.';
        } else if (error.status === 401) {
          errorMessage = 'API configuration error. Please contact support.';
        }
      }
      logger.error('Error in chat service:', errorMessage);
      return {
        success: false,
        response: fallbackResponse,
        message_id: messageId,
        research_pending: false,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get message history for a session
   */
  static async getMessageHistory(sessionId: string, limit: number = 50) {
    try {
      return await MessageService.getMessagesBySessionId(sessionId, limit);
    } catch (error) {
      logger.error('Error getting message history:', error);
      return [];
    }
  }

  /**
   * Get user's message history
   */
  static async getUserMessageHistory(userId: string, limit: number = 50) {
    try {
      return await MessageService.getMessagesByUserId(userId, limit);
    } catch (error) {
      logger.error('Error getting user message history:', error);
      return [];
    }
  }
} 