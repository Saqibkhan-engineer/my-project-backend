import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { clearScreenDown } from 'readline';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);

  private readonly modelName = 'gpt-4'; 

  private readonly openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async enhanceProposal(data: {
    title: string;
    description?: string;
    scope?: string;
    modules?: string | string[];
  }) {
    this.logger.log('🚀 Enhancing proposal using OpenAI...');

    const scopeText = (data.scope || data.description || '').substring(0, 500);
    const modulesText = Array.isArray(data.modules)
      ? data.modules.slice(0, 5).join(', ')
      : (data.modules || '').substring(0, 200);

  const prompt = `
You are an AI assistant specialized in improving Final Year Project proposals.
Your task is to enhance the proposal title and scope, and suggest additional modules or features that make the project unique, practical, and valuable. 

RETURN ONLY CLEAN JSON. DO NOT ADD EXTRA TEXT OUTSIDE JSON.

Input:
Title: ${data.title}
Scope: ${scopeText}
Existing Modules: ${modulesText || 'None'}

Required JSON Output:
{
  "title": "Improved, unique, and catchy title",
  "scope": "Enhanced project scope in 2-3 concise sentences",
  "modules": ["module1", "module2", "module3", "extraModule1", "extraModule2"]
}
Notes:
- Keep existing modules but suggest 1-3 additional modules/features to make the project stand out.
- Modules can be software components, AI features, integrations, or tools relevant to the project.
- Make the project sound professional and feasible for implementation.
`;


    try {
      const completion = await this.openai.chat.completions.create({
        model: this.modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      });

      const raw = completion.choices[0]?.message?.content || '';
      const clean = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);

      this.logger.log(`✅ Enhanced Title: ${parsed.title}`);

      return {
        title: parsed.title || data.title,
        scope: parsed.scope || data.scope || '',
        modules: Array.isArray(parsed.modules) ? parsed.modules : [],
      };
    } catch (err: any) {
      this.logger.error(`❌ OpenAI Error: ${err.message}`);
      console.log('the error should be caught here')
      throw new Error('AI_ERROR: Could not process request.');
    }
  }
}
