import axios from 'axios';
import FormData from 'form-data';
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExistingProject } from '../proposal/entities/existing-project.entity';

@Injectable()
export class FypOfficeService {
  constructor(
    @InjectRepository(ExistingProject)
    private readonly existingRepo: Repository<ExistingProject>,
  ) {}

  // ================================
  // SAVE PROPOSAL
  // ================================
  async saveProposal(body: any, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // Get embeddings from AI service
    const aiResponse = await this.getEmbeddings(body, file);

    console.log('AI RESPONSE:', JSON.stringify(aiResponse, null, 2));

    const data = aiResponse?.data || aiResponse;
    const embeddings = data?.embeddings || data;

    // Validate embeddings
    if (!embeddings) {
      throw new BadRequestException('Embeddings not returned from AI service');
    }

    const project = this.existingRepo.create({
      title: data?.title || body.title,
      projectType: body.projectType || body.domain || 'FYP',
      fileUrl: '',

      // SAFE MAPPING (fix null issue)
      titleEmbedding:
        embeddings.titleEmbedding ??
        embeddings.title_embedding ??
        null,

      scopeEmbedding:
        embeddings.scopeEmbedding ??
        embeddings.scope_embedding ??
        null,

      modulesEmbedding:
        embeddings.modulesEmbedding ??
        embeddings.modules_embedding ??
        null,
    });

    await this.existingRepo.save(project);

    return {
      message: 'Existing proposal saved successfully',
      existingProjectId: project.id,
    };
  }

  // ================================
  // CALL PYTHON AI SERVICE
  // ================================
  private async getEmbeddings(
    body: any,
    file: Express.Multer.File,
  ) {
    const url = process.env.AI_SERVER_URL as string;

    const form = new FormData();

    form.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    form.append('title', body.title || '');
    form.append('description', body.description || '');
    form.append('domain', body.domain || '');

    try {
      const res = await axios.post(url, form, {
        headers: form.getHeaders(),
        timeout: 60000, // 60 sec timeout (important for AI calls)
      });

      return res.data;
    } catch (error) {
      console.error('AI SERVICE ERROR:', error?.response?.data || error.message);
      throw new BadRequestException('AI embedding service failed');
    }
  }
}