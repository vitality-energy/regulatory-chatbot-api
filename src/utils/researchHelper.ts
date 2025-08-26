import OpenAI from 'openai';
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { logger } from './logger';
import { ResearchPrompt } from './prompts';
import { MessageService } from '../services';
import { Message } from '../services/chatService';
import { MessageType } from './types';

const CITATION_REQUEST_TIMEOUT = 10000; // 10 seconds
const MIN_MEANINGFUL_CONTENT_LENGTH = 4000; // minimum length of content to be considered meaningful
const RESEARCH_CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutes
const RESEARCH_EXPIRATION_AGE = 30 * 60 * 1000; // 30 minutes

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// In-memory store for research results.
const researchStore = new Map<string, any>();

/**
 * Clean up weird citation references and convert them to proper citation format
 * Converts patterns like "citeturn6search0", "citeturn0search0" to [1], [2], etc.
 */
const cleanCitationReferences = (text: string, citations: Citation[]): string => {

  const citationPattern = /cite.*?/g;
  const foundCitations = text.match(citationPattern) || [];
  
  // The map ensures each unique citation gets one number, even if it appears multiple times.
  const citationMap = new Map<string, number>();
  let citationCounter = 1;
  
  // Process each found citation and assign it a number
  foundCitations.forEach(citation => {
    if (!citationMap.has(citation)) {
      citationMap.set(citation, citationCounter);
      citationCounter++;
    }
  });
  
  let cleanedText = text;
  
  // Replace all instances of each unique citation with its numbered format
  citationMap.forEach((citationNum, citationRef) => {
    const escapedCitationRef = citationRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedCitationRef, 'g');
    cleanedText = cleanedText.replace(regex, `[${citationNum}]`);
  });
  
  logger.info(`Cleaned ${citationMap.size} unique citation references`);
  return cleanedText;
};

// Define Zod schemas for OpenAI structured outputs
// Using simple validations to avoid unsupported JSON schema formats
export const CitationSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  url: z.string().min(1), // Simple string - URL format validation done in validateSingleCitation()
  relevance_score: z.number().min(0).max(10),
});

export const KeyDevelopmentSchema = z.object({
  number: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().min(1),
  citations: z.array(z.number().int().positive()),
});

export const ResearchResponseSchema = z.object({
  research_results: z.string().min(1), // Executive summary
  key_developments: z.array(KeyDevelopmentSchema),
  citations: z.array(CitationSchema),
});

export type Citation = z.infer<typeof CitationSchema>;
export type KeyDevelopment = z.infer<typeof KeyDevelopmentSchema>;
export type ResearchResponse = z.infer<typeof ResearchResponseSchema>;

export interface ResearchResult {
  id: string;
  status: 'pending' | 'completed' | 'failed';
  research_results?: string;
  key_developments?: KeyDevelopment[];
  citations?: Citation[];
  citation_validation?: CitationValidationResult[];
  error?: string;
  timestamp: string;
}

export interface CitationValidationResult {
  id: number;
  url: string;
  isValid: boolean;      // Is the URL format valid?
  isAccessible: boolean; // Did the URL respond with a 2xx status?
  hasContent: boolean;   // Does the content appear to be meaningful?
  statusCode?: number;
  contentLength?: number;
  error?: string;
}

// NEW: Helper function to validate a single citation. This aids in parallel execution.
const validateSingleCitation = async (citation: Citation): Promise<CitationValidationResult> => {
    const result: CitationValidationResult = {
        id: citation.id,
        url: citation.url,
        isValid: false,
        isAccessible: false,
        hasContent: false,
    };

    try {
        new URL(citation.url);
        result.isValid = true; // If it doesn't throw, the format is valid.

        logger.info(`Validating citation URL: ${citation.url}`);

        // Step 2: Make HTTP request with timeout.
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CITATION_REQUEST_TIMEOUT);

        const response = await fetch(citation.url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; ResearchBot/1.0)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            redirect: 'follow',
            method: 'GET'
        });

        clearTimeout(timeoutId);

        result.statusCode = response.status;
        result.isAccessible = response.ok; // true for status 200-299

        if (response.ok) {
            const contentType = response.headers.get('content-type') || '';
            
            if (contentType.includes('text/html') || contentType.includes('text/plain') || contentType.includes('application/xml')) {
                const content = await response.text();
                result.contentLength = content.length;
                // Strip tags and normalize whitespace to check for meaningful text.
                const meaningfulContent = content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
                result.hasContent = meaningfulContent.length > MIN_MEANINGFUL_CONTENT_LENGTH;
            } else {
                // Assume other content types (PDF, images) have content if they are accessible.
                result.hasContent = true;
                result.contentLength = parseInt(response.headers.get('content-length') || '0');
            }
        }
    } catch (error: any) {
        result.error = error instanceof Error ? error.message : 'Unknown error';
        if (error.name === 'AbortError') {
            result.error = 'Request timeout';
        }
        if (error instanceof TypeError && error.message.includes('Invalid URL')) {
            result.isValid = false;
        }
    }
    return result;
};


/**
 * 
 * @param citations Array of citation objects with a url property.
 * @returns A promise that resolves to an array of validation results.
 */
export const validateCitationUrls = async (citations: Citation[]): Promise<CitationValidationResult[]> => {
    // Map each citation to a validation promise.
    const validationPromises = citations.map(citation => validateSingleCitation(citation));
    
    // Wait for all validation promises to settle.
    const results = await Promise.all(validationPromises);
    
    return results;
};


/**
 * Kicks off the asynchronous research process for a given conversation.
 * @param messageId The ID of the message that triggered the research.
 * @param allMessages The full conversation history.
 * @param userId The ID of the user who sent the message.
 * @param userLocation Optional user location to refine search results.
 */
export const performResearchAsync = async (
  messageId: string,
  allMessages: Message[],
  userId: string,
  userLocation?: string
): Promise<void> => {
  try {
    logger.info(`Starting async research for message ${messageId} for user ${userId}`);
    
    researchStore.set(messageId, {
      id: messageId,
      status: 'pending',
      timestamp: new Date().toISOString(),
    });

    let enhancedPrompt = ResearchPrompt;
    if (userLocation) {
      enhancedPrompt += `\n\nUser Location: ${userLocation} - Prioritize sources from this region.`;
    }

    const last5Messages = allMessages.slice(-5);
    const query = last5Messages.map(message => 
      `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.content}`
    ).join('\n');

    // Using OpenAI Structured Outputs with Zod schemas to ensure properly formatted response
    // This guarantees the response will conform to our defined schema structure
    const researchResponse = await openai.responses.parse({
      prompt: {
        "id": process.env.RESEARCH_PROMPT_ID!,
      },
      input: query,
      text: {
        format: zodTextFormat(ResearchResponseSchema, "research_response"),
      },
      max_output_tokens: 90000,
    });
    const researchResponseJson = researchResponse.output_parsed;

    if (!researchResponseJson) {
      throw new Error('No research response received from OpenAI');
    }
    
    logger.info(`Research response received with ${researchResponseJson.citations.length} citations`);
    
    logger.info(`Completed research for message ${messageId}`);
    
    // Clean citations from the structured response
    const cleanedResearchResults = cleanCitationReferences(
      researchResponseJson.research_results, 
      researchResponseJson.citations
    );

    logger.info(`Key developments: ${JSON.stringify(researchResponseJson.key_developments, null, 2)}`);
    
    const cleanedKeyDevelopments = researchResponseJson.key_developments.map((keyDevelopment: KeyDevelopment) => ({
      ...keyDevelopment,
      title: cleanCitationReferences(keyDevelopment.title, researchResponseJson.citations),
      description: cleanCitationReferences(keyDevelopment.description, researchResponseJson.citations)
    }));
    
    logger.info(`Cleaned key developments: ${JSON.stringify(cleanedKeyDevelopments, null, 2)}`);
    
    // Format the final output combining cleaned executive summary and key developments
    let processedResearchResults = cleanedResearchResults;
    
    if (cleanedKeyDevelopments.length > 0) {
      processedResearchResults += '\n\n';
      cleanedKeyDevelopments.forEach(dev => {
        const citationText = dev.citations && dev.citations.length > 0 
          ? ` [${dev.citations.join(', ')}]` 
          : '';
        processedResearchResults += `${dev.number}. ${dev.title}${citationText}\n${dev.description}\n\n`;
      });
    }
    
    logger.info(`Successfully cleaned research results with ${cleanedKeyDevelopments.length} key developments`);

    if (researchResponseJson.citations && researchResponseJson.citations.length > 0) {
      logger.info(`Validating ${researchResponseJson.citations.length} citations for message ${messageId}`);
      const validationResults = await validateCitationUrls(researchResponseJson.citations);
      
      const validUrls = new Set(
          validationResults
              .filter(r => r.isValid && r.isAccessible && r.hasContent)
              .map(r => r.url)
      );

      // Keeps the citation if valid, or returns it without the URL if invalid.
      researchResponseJson.citations = researchResponseJson.citations.map((citation: Citation) => {
          if (validUrls.has(citation.url)) {
              return citation; // Citation is valid, return as is.
          }
          // Citation is invalid, return the object without the 'url' property.
          const { url, ...rest } = citation;
          return { 
            ...rest, 
            url: '', // Keep the structure but empty the URL
            title: citation.title + ' (URL was invalid or inaccessible)'
          } as Citation;
      });

      logger.info(`Citation validation summary: ${validUrls.size} valid out of ${validationResults.length} total.`);
    }

    await MessageService.createBotMessage(
      `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      processedResearchResults,
      {
        research_results: cleanedResearchResults,
        key_developments: cleanedKeyDevelopments,
        citations: researchResponseJson.citations,
      },
      messageId,
      userId
    );



    researchStore.set(messageId, {
      id: messageId,
      status: 'completed',
      research_results: cleanedResearchResults,
      key_developments: cleanedKeyDevelopments,
      citations: researchResponseJson.citations,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error(`Research failed for message ${messageId}:`, error);
    
    researchStore.set(messageId, {
      id: messageId,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Retrieves a research result from the in-memory store.
 * @param messageId The ID of the message to retrieve results for.
 * @returns The research result or null if not found.
 */
export const getResearchResult = (messageId: string): ResearchResult | null => {
  return researchStore.get(messageId) || null;
};

/**
 * Deletes a specific research result from the store.
 * @param messageId The ID of the research result to delete.
 */
export const cleanupResearchResult = (messageId: string): void => {
  researchStore.delete(messageId);
};

/**
 * Validates citations for an existing, completed research result.
 * @param messageId The message ID to validate citations for.
 * @returns A promise that resolves to the validation results or null.
 */
export const validateExistingCitations = async (messageId: string): Promise<CitationValidationResult[] | null> => {
  const researchResult = getResearchResult(messageId);
  
  if (!researchResult || !researchResult.citations || researchResult.citations.length === 0) {
    logger.warn(`No citations found to validate for research result ${messageId}`);
    return null;
  }

  logger.info(`Validating existing citations for research result ${messageId}`);
  const validationResults = await validateCitationUrls(researchResult.citations);
  
  // Update the stored result with validation data.
  researchStore.set(messageId, {
    ...researchResult,
    citation_validation: validationResults,
  });
  
  return validationResults;
};

/**
 * Periodically cleans up old research results from the in-memory store.
 */
export const cleanupOldResearch = (): void => {
  const now = new Date();
  const expirationTime = new Date(now.getTime() - RESEARCH_EXPIRATION_AGE);
  
  for (const [messageId, result] of researchStore.entries()) {
    const resultTime = new Date(result.timestamp);
    if (resultTime < expirationTime) {
      researchStore.delete(messageId);
      logger.info(`Cleaned up old research result for message ${messageId}`);
    }
  }
};

// Schedule the cleanup task to run periodically.
setInterval(cleanupOldResearch, RESEARCH_CLEANUP_INTERVAL);