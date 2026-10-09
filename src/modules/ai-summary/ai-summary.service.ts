import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { LeadsService } from '../leads/leads.service';

@Injectable()
export class AiSummaryService {
  private genAI: GoogleGenerativeAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly leadsService: LeadsService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  async getLeadSummary(leadId: string): Promise<{ summary: string }> {
    if (!this.genAI) {
      return { summary: 'Gemini API key is missing. Please configure GEMINI_API_KEY in your .env file to enable free AI summaries.' };
    }

    try {
      const lead = await this.leadsService.findOne(leadId);
      if (!lead) {
        throw new NotFoundException(`Lead with ID ${leadId} not found`);
      }

      const prompt = `You are an expert CRM assistant. Please summarize the following lead's information in 3 concise bullet points and suggest the next best action.
      
      Lead Name: ${lead.fullName}
      Email: ${lead.email}
      Phone: ${lead.phone}
      Status: ${lead.status}
      Source: ${lead.leadSource}
      City: ${lead.city || 'N/A'}
      
      Please format the response as markdown.`;

      const model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
      const result = await model.generateContent(prompt);
      const summary = result.response.text() || 'Unable to generate summary.';
      
      return { summary };
    } catch (error: any) {
      console.error('Error generating AI summary:', error);
      throw new InternalServerErrorException(error?.message || 'Failed to generate AI summary');
    }
  }
}
