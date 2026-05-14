import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import FormData from 'form-data';
import { Repository } from 'typeorm';
import { Proposal } from './entities/proposal.entity';
import { ExistingProject } from './entities/existing-project.entity';
import { GeminiService } from 'src/gemini/gemini.service';

@Injectable()
export class ProposalService {
  constructor(
    @InjectRepository(Proposal)
    private readonly repo: Repository<Proposal>,

    @InjectRepository(ExistingProject)
    private readonly existingProjectRepo: Repository<ExistingProject>,

    private readonly gemini: GeminiService,
    
  ) {}

 
  async checkSimilarity(
    body: any,
    file: Express.Multer.File,
    studentId?: number,
  ) {
    if (!file) throw new Error('File is required');

    const response = await this.getEmbeddingsFromPython(body, file);
    const embeddings = response.embeddings;

    const similar = await this.findSimilarProjects(embeddings);
    const highestSimilarity =
      similar.length > 0
        ? similar[0].similarities.weightedSimilarity
        : 0;

    return {
      status: 'ok',
      proposalData: {
        title: response.title,
        description: body.description || '',
        domain: body.domain || '',
        studentId,
        titleVec: embeddings.title_embedding,
        scopeVec: embeddings.scope_embedding,
        modulesVec: embeddings.modules_embedding,
        highestSimilarity,
      },
      original: {
        title: response.title,
        scope: response.scope,
        modules: response.modules,
      },
      similarProjects: similar.slice(0, 5),
      highestSimilarity,
    };
  }


  async enhanceProposalWithGemini(data: {
    title: string;
    description: string;
    scope?: string;
    modules?: string | string[];
  }) {
    try {
      const enhanced = await this.gemini.enhanceProposal({
        title: data.title,
        description: data.description,
        scope: data.scope,
        modules: data.modules,
      });

      return {
        title: enhanced.title,
        scope: enhanced.scope,
        modules: Array.isArray(enhanced.modules)
          ? enhanced.modules.map((m: any) => m.name || m)
          : [],
      };
    } catch (err) {
      throw new Error('Enhancement failed: ' + err.message);
    }
  }


  async getStudentProposal(studentId: number) {
    return this.repo.findOne({
      where: { studentId },
      order: { createdAt: 'DESC' },
    });
  }

  async fetchAllProposals() {
    return this.repo.find({
      order: { createdAt: 'DESC' },
    });
  }


  private async getEmbeddingsFromPython(
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
      });
      return res.data.data;
    } catch (error) {
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error('PDF processing server not reachable');
    }
  }

  private async findSimilarProjects(studentEmb: any) {
    const projects = await this.existingProjectRepo.find();

    return projects
      .filter(p => p.titleEmbedding && p.scopeEmbedding && p.modulesEmbedding)
      .map(proj => {
        const similarities = this.calculateWeightedSimilarity(
          {
            title: studentEmb.title_embedding,
            scope: studentEmb.scope_embedding,
            modules: studentEmb.modules_embedding,
          },
          {
            title: proj. titleEmbedding,
            scope: proj.scopeEmbedding,
            modules: proj.modulesEmbedding,
          },
        );

        return {
          id: proj.id,
          title: proj.title,
          projectType: proj.projectType,
          fileUrl: proj.fileUrl,
          similarities,
        };
      })
      .sort(
        (a, b) =>
          b.similarities.weightedSimilarity -
          a.similarities.weightedSimilarity,
      );
  }

  private cosine(a: number[], b: number[]) {
    if (!a || !b || a.length !== b.length) return 0;

    const dot = a.reduce((s, x, i) => s + x * b[i], 0);
    const magA = Math.sqrt(a.reduce((s, x) => s + x * x, 0));
    const magB = Math.sqrt(b.reduce((s, x) => s + x * x, 0));

    return magA && magB ? dot / (magA * magB) : 0;
  }

  private calculateWeightedSimilarity(stu, proj) {
    const titleSim = this.cosine(stu.title, proj.title);
    const scopeSim = this.cosine(stu.scope, proj.scope);
    const modulesSim = this.cosine(stu.modules, proj.modules);

    const weighted =
      titleSim * 0.5 + scopeSim * 0.3 + modulesSim * 0.2;

    const round = (v: number) => Math.round(v * 10000) / 100;

    return {
      titleSimilarity: round(titleSim),
      scopeSimilarity: round(scopeSim),
      modulesSimilarity: round(modulesSim),
      weightedSimilarity: round(weighted),
    };
  }
}
