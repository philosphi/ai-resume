import { Buffer } from 'buffer';
import { extractText } from './pdf';
import { openai } from './api';
import { buildPrompt, createChatCompletion } from './prompts';
import { PromptObject } from './buildSchemaPrompt';

export const aiPdfHandler = async (
  fileBuffer: Buffer,
): Promise<any> => {
  try {
    // Extract the text from the PDF
    const documentText = await extractText(fileBuffer);

    const prompt: PromptObject = {
      id: 1,
      prompt: buildPrompt(documentText),
    };

    const prompts: PromptObject[] = []
    prompts.push(prompt);

    const aiResponsesPromises = prompts
      .map(subPrompt => {
        if (subPrompt.prompt) {
          return createChatCompletion(openai, subPrompt);
        }
      })
      .filter(promise => promise !== undefined);

    const completedPromptObjects = await Promise.all(aiResponsesPromises);
    const resultObjectArr = completedPromptObjects.map(completedPromptObj => {
      if (completedPromptObj?.output) {
        return completedPromptObj.output;
      }
    });
    return zipObjects(resultObjectArr);
  } catch (error: any) {
    console.error(error);

    throw new Error(error);
  }
};

const zipObjects = (aiResponse: any[]): any => {
  return Object.assign({}, ...aiResponse);
};
