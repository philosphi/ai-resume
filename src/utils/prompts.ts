import { PromptObject, generatePromptObjects } from './buildSchemaPrompt';
import { OpenAIApi } from 'openai';
import { Schema } from '@Types/schemaTypes';

export const buildPromptArray = (
  documentText: string,
  schema: Schema,
): PromptObject[] => {
  const promptObjects: PromptObject[] = generatePromptObjects(schema);

  // loop over each prompt object
  promptObjects.forEach(subPrompt => {
    subPrompt.prompt = buildPrompt(documentText);
  });

  return promptObjects;
};

export const buildPrompt = (documentText: string): string => {
  let prompt = `I have the following document text :\n\n`;

  prompt += documentText;

  prompt +=
    '\n\nGiven the following resume text, extract the individuals professional details and format them into a structured JSON object using the schema below. Ensure that all bullet points under each work section are included in the highlights in verbatim.\n\n';

  prompt += `{
    "basics": {
      "name": "John Doe",
      "label": "Programmer",
      "image": "",
      "email": "john@gmail.com",
      "phone": "(912) 555-4321",
      "url": "https://johndoe.com",
      "summary": "A summary of John Doe…",
      "location": {
        "address": "2712 Broadway St",
        "postalCode": "CA 94115",
        "city": "San Francisco",
        "countryCode": "US",
        "region": "California"
      },
      "profiles": [{
        "network": "Twitter",
        "username": "john",
        "url": "https://twitter.com/john"
      }]
    },
    "work": [{
      "name": "Company",
      "position": "President",
      "url": "https://company.com",
      "startDate": "2013-01-01",
      "endDate": "2014-01-01",
      "summary": "Description…",
      "highlights": [
        "Started the company"
      ]
    }],
    "volunteer": [{
      "organization": "Organization",
      "position": "Volunteer",
      "url": "https://organization.com/",
      "startDate": "2012-01-01",
      "endDate": "2013-01-01",
      "summary": "Description…",
      "highlights": [
        "Awarded 'Volunteer of the Month'"
      ]
    }],
    "education": [{
      "institution": "University",
      "url": "https://institution.com/",
      "area": "Software Development",
      "studyType": "Bachelor",
      "startDate": "2011-01-01",
      "endDate": "2013-01-01",
      "score": "4.0",
      "courses": [
        "DB1101 - Basic SQL"
      ]
    }],
    "awards": [{
      "title": "Award",
      "date": "2014-11-01",
      "awarder": "Company",
      "summary": "There is no spoon."
    }],
    "certificates": [{
      "name": "Certificate",
      "date": "2021-11-07",
      "issuer": "Company",
      "url": "https://certificate.com"
    }],
    "publications": [{
      "name": "Publication",
      "publisher": "Company",
      "releaseDate": "2014-10-01",
      "url": "https://publication.com",
      "summary": "Description…"
    }],
    "skills": [{
      "name": "Web Development",
      "level": "Master",
      "keywords": [
        "HTML",
        "CSS",
        "JavaScript"
      ]
    }],
    "languages": [{
      "language": "English",
      "fluency": "Native speaker"
    }],
    "interests": [{
      "name": "Wildlife",
      "keywords": [
        "Ferrets",
        "Unicorns"
      ]
    }],
    "references": [{
      "name": "Jane Doe",
      "reference": "Reference…"
    }],
    "projects": [{
      "name": "Project",
      "startDate": "2019-01-01",
      "endDate": "2021-01-01",
      "description": "Description...",
      "highlights": [
        "Won award at AIHacks 2016"
      ],
      "url": "https://project.com/"
    }]
  }`;

  prompt +=
    '\n\nIf a data field is unknown, use a null value.\n\n###';

  return prompt;
};

export const createChatCompletion = async (
  openai: OpenAIApi,
  promptObject: PromptObject,
): Promise<PromptObject> => {
  try {
    if (!promptObject.prompt) {
      return promptObject;
    }

    console.log('Firing prompt ID:', promptObject.id, '...');
    console.time('Execution Time for Prompt ID: ' + promptObject.id);

    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: promptObject.prompt,
        },
      ],
    });

    console.log('Prompt ID:', promptObject.id, 'completed.');
    console.timeEnd('Execution Time for Prompt ID: ' + promptObject.id);

    const message = response.data.choices[0]?.message?.content;

    if (!message) {
      throw new Error('No message returned from OpenAI');
    } else {
      // copy the prompt object
      const resultPromptObject = { ...promptObject };
      resultPromptObject.output = convertTextToValidArray(message);

      return resultPromptObject;
    }
  } catch (error: any) {
    console.error('Error creating completion');
    throw error;
  }
};

function convertTextToValidArray(jsonString: string): any[] {
  const openedBrackets = (jsonString.match(/\[/g) || []).length;
  const closedBrackets = (jsonString.match(/\]/g) || []).length;
  const missingBrackets = openedBrackets - closedBrackets;

  if (missingBrackets > 0) {
    // Check if the last character is not a double quote
    if (jsonString[jsonString.length - 1] !== '"') {
      jsonString += '"';
    }
    for (let i = 0; i < missingBrackets; i++) {
      jsonString += ']';
    }
  }

  //remove json markdown
  jsonString = jsonString.replace(/^```json|```$/g, '').trim();

  try {
    // Remove leading/trailing white spaces and newline characters
    const trimmedString = jsonString.trim();

    // Remove the trailing comma before the closing bracket
    const fixedString = trimmedString.replace(/,\s*\]$/, ']');

    // Remove NULL character (U+0000)
    const stringWithoutNullChar = fixedString.replace(/\u0000/g, '');

    const afterParse = JSON.parse(stringWithoutNullChar);

    if (missingBrackets > 0) {
      afterParse.pop();
    }

    return afterParse;
  } catch (error) {
    console.error('Error parsing JSON string:', error);

    throw new Error('Error parsing JSON string');
  }
}
