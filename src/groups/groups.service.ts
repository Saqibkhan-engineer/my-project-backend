import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Group } from './entities/group.entity';
import { Student } from '../students/entities/student.entity';
import { SupervisorProposal } from '../supervisor-proposal/entities/supervisor-proposal.entity';
import axios from 'axios';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private groupRepo: Repository<Group>,
    @InjectRepository(Student)
    private studentRepo: Repository<Student>,
    @InjectRepository(SupervisorProposal)
    private supervisorProposalRepo: Repository<SupervisorProposal>,
  ) {}

  private get githubHeaders() {
    const token = process.env.GITHUB_TOKEN;
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
    if (token) {
      // Classic PATs (ghp_*) use 'token' prefix; fine-grained use 'Bearer'
      headers['Authorization'] = token.startsWith('github_pat_') ? `Bearer ${token}` : `token ${token}`;
    }
    return headers;
  }

  private parseRepoUrl(url: string): { owner: string; repo: string } {
    const part = url.split('github.com/')[1]?.replace(/\/$/, '').replace(/\.git$/, '');
    if (!part) throw new Error('Invalid GitHub URL');
    const [owner, repo] = part.split('/');
    if (!owner || !repo) throw new Error('Invalid GitHub URL format');
    return { owner, repo };
  }

  // GitHub stats/contributors returns 202 on first call — need to retry
  private async fetchContributorStats(owner: string, repo: string, headers: Record<string, string>): Promise<any[]> {
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const r = await axios.get(
          `https://api.github.com/repos/${owner}/${repo}/stats/contributors`,
          { headers, timeout: 15000 },
        );
        if (r.status === 200 && Array.isArray(r.data)) return r.data;
        // 202 means GitHub is computing — wait and retry
        if (r.status === 202) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
      } catch (_) {}
    }
    return [];
  }

  private async enrichWithStudentDetails(groups: Group[]) {
    // Collect all supervisorProposalIds that need title lookup
    const spIds = groups
      .filter(g => g.supervisorProposalId && !g.proposalId)
      .map(g => g.supervisorProposalId);

    let spTitleMap: Record<number, string> = {};
    if (spIds.length > 0) {
      const spList = await this.supervisorProposalRepo.find({
        where: { id: In(spIds) },
        select: ['id', 'title'],
      });
      spList.forEach(sp => { spTitleMap[sp.id] = sp.title; });
    }

    for (const group of groups) {
      // Attach supervisor proposal title for display
      if (group.supervisorProposalId && spTitleMap[group.supervisorProposalId]) {
        (group as any).supervisorProposalTitle = spTitleMap[group.supervisorProposalId];
      }

      if (group.studentIds && group.studentIds.length > 0) {
        const students = await this.studentRepo.find({
          where: { id: In(group.studentIds) },
          relations: ['user'],
        });
        (group as any).studentDetails = students.map(s => ({
          name: s.user?.name || 'Unknown',
          regNo: s.regNo,
        }));
      }
    }
    return groups;
  }

  async getGroupsBySupervisor(supervisorId: number) {
    const groups = await this.groupRepo.find({
      where: { supervisorId: Number(supervisorId) },
      relations: ['proposal', 'supervisor', 'supervisor.user'],
      order: { createdAt: 'DESC' },
    });
    return this.enrichWithStudentDetails(groups);
  }

  async getGroupsByStudentId(studentId: number) {
    const groups = await this.groupRepo.find({
      relations: ['proposal', 'supervisor', 'supervisor.user'],
      order: { createdAt: 'DESC' },
    });
    const filtered = groups.filter(g =>
      g.leadStudentId === Number(studentId) ||
      (g.studentIds && g.studentIds.includes(Number(studentId)))
    );
    return this.enrichWithStudentDetails(filtered);
  }

  async isStudentInGroup(studentId: number): Promise<boolean> {
    const groups = await this.getGroupsByStudentId(studentId);
    return groups.length > 0;
  }

  async countGroupsForSupervisor(supervisorId: number): Promise<number> {
    return this.groupRepo.count({ where: { supervisorId: Number(supervisorId) } });
  }

  // Only repoUrl is required now — usernames are auto-fetched from GitHub
  async updateRepo(groupId: number, body: { repoUrl: string }) {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) throw new Error('Group not found');
    group.repoUrl = body.repoUrl;
    group.githubUsernames = []; // will be auto-populated from GitHub
    return await this.groupRepo.save(group);
  }

  async checkPerformance(groupId: number) {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group || !group.repoUrl) throw new Error('Repository URL is not set for this group');

    const { owner, repo } = this.parseRepoUrl(group.repoUrl);
    const headers = this.githubHeaders;

    // ── 1. Repo metadata ───────────────────────────────────────────────────
    let repoInfo: any = {};
    try {
      const r = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, { headers, timeout: 10000 });
      const d = r.data;
      repoInfo = {
        name: d.name,
        fullName: d.full_name,
        description: d.description,
        language: d.language,
        stars: d.stargazers_count,
        forks: d.forks_count,
        openIssues: d.open_issues_count,
        watchers: d.watchers_count,
        defaultBranch: d.default_branch,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
        pushedAt: d.pushed_at,
        visibility: d.visibility,
        topics: d.topics || [],
        license: d.license?.name || null,
        htmlUrl: d.html_url,
        size: d.size,
      };
    } catch (err) {
      console.error(`[GitHub] Failed to fetch repo info for ${owner}/${repo}:`, err?.response?.status, err?.response?.data?.message || err.message);
    }

    // ── 2. All commits in last 4 weeks ─────────────────────────────────────
    const since = new Date(Date.now() - 4 * 7 * 24 * 3600 * 1000).toISOString();
    let allCommits: any[] = [];
    try {
      for (let page = 1; page <= 3; page++) {
        const r = await axios.get(
          `https://api.github.com/repos/${owner}/${repo}/commits?since=${since}&per_page=100&page=${page}`,
          { headers, timeout: 15000 },
        );
        const data = r.data as any[];
        allCommits = [...allCommits, ...data];
        if (data.length < 100) break;
      }
    } catch (err) {
      console.error(`[GitHub] Failed to fetch commits for ${owner}/${repo}:`, err?.response?.status, err?.response?.data?.message || err.message);
    }

    // ── 3. Contributor stats (weekly breakdown) — with retry ───────────────
    const statsData = await this.fetchContributorStats(owner, repo, headers);
    if (statsData.length === 0) {
      console.warn(`[GitHub] No contributor stats available for ${owner}/${repo} (may need retry or repo has no activity)`);
    }

    // Helper: get a stable identifier for a commit's author
    // GitHub c.author can be null when email isn't linked to any GitHub account
    const getContributorKey = (c: any): string => {
      return c.author?.login                    // GitHub login (best)
          || c.commit?.author?.name             // git committer name (fallback)
          || c.commit?.committer?.name          // committer name (last resort)
          || 'Unknown';
    };

    // Auto-discover all contributors from commits + stats
    const allLogins = new Set<string>();
    allCommits.forEach(c => allLogins.add(getContributorKey(c)));
    statsData.forEach(c => { if (c.author?.login) allLogins.add(c.author.login); });
    allLogins.delete('Unknown'); // remove placeholder if real names found

    // ── 4. Per-contributor commit details ─────────────────────────────────
    const commitDetails: Record<string, any[]> = {};
    const individualCommits: Record<string, number> = {};

    allLogins.forEach(key => {
      commitDetails[key] = [];
      individualCommits[key] = 0;
    });

    allCommits.forEach(c => {
      const key = getContributorKey(c);
      if (!allLogins.has(key)) return;
      individualCommits[key] = (individualCommits[key] || 0) + 1;
      commitDetails[key].push({
        sha: c.sha,
        shortSha: c.sha?.substring(0, 7),
        message: c.commit?.message || '',
        date: c.commit?.author?.date,
        author: c.commit?.author?.name,
        email: c.commit?.author?.email,
        url: c.html_url,
        avatarUrl: c.author?.avatar_url || null,
      });
    });

    // ── 5. Weekly breakdown (last 4 weeks) ────────────────────────────────
    const now = Date.now();
    const WEEK_MS = 7 * 24 * 3600 * 1000;
    const fourWeeksAgo = now - 4 * WEEK_MS;
    const weekLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];

    const contributorWeeklyData: Record<string, number[]> = {};
    allLogins.forEach(key => { contributorWeeklyData[key] = [0, 0, 0, 0]; });

    // Map stats login → key (same if login exists, otherwise stats won't help)
    statsData.forEach(c => {
      const login: string = c.author?.login;
      if (!login || !allLogins.has(login)) return;
      const recentWeeks = (c.weeks as any[]).filter(w => w.w * 1000 >= fourWeeksAgo);
      recentWeeks.forEach((w, i) => {
        if (i < 4) contributorWeeklyData[login][i] = (contributorWeeklyData[login][i] || 0) + w.c;
      });
    });


    // Fallback: build weekly data from commit dates if stats unavailable
    if (statsData.length === 0 && allCommits.length > 0) {
      allCommits.forEach(c => {
        const key = getContributorKey(c);
        if (!allLogins.has(key)) return;
        const commitTime = new Date(c.commit?.author?.date).getTime();
        const weeksAgo = Math.floor((now - commitTime) / WEEK_MS);
        const weekIndex = 3 - Math.min(weeksAgo, 3);
        if (weekIndex >= 0 && weekIndex < 4) {
          contributorWeeklyData[key][weekIndex] = (contributorWeeklyData[key][weekIndex] || 0) + 1;
        }
      });
    }

    // ── 6. All-time stats from GitHub stats endpoint ───────────────────────
    const allTimeStats: Record<string, { total: number; additions: number; deletions: number }> = {};
    statsData.forEach(c => {
      const login: string = c.author?.login;
      if (!login || !allLogins.has(login)) return;
      const totalAdd = (c.weeks as any[]).reduce((s, w) => s + w.a, 0);
      const totalDel = (c.weeks as any[]).reduce((s, w) => s + w.d, 0);
      allTimeStats[login] = { total: c.total, additions: totalAdd, deletions: totalDel };
    });

    // ── 7. Summary stats ──────────────────────────────────────────────────
    const totalAllTime = statsData.reduce((s, c) => {
      const login = c.author?.login;
      return allLogins.has(login) ? s + c.total : s;
    }, 0);

    const lastCommitDate = allCommits[0]?.commit?.author?.date || null;
    const mostActive = Object.entries(individualCommits)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || null;

    // ── 8. Persist updated data ───────────────────────────────────────────
    group.githubUsernames = Array.from(allLogins);
    group.totalCommits = totalAllTime || allCommits.length;
    group.individualCommits = individualCommits;
    await this.groupRepo.save(group);

    return {
      repoInfo,
      totalCommits: group.totalCommits,
      individualCommits,
      recentCommits: commitDetails,
      weekLabels,
      contributorWeeklyData,
      allTimeStats,
      lastCommitDate,
      mostActive,
      repoUrl: group.repoUrl,
      owner,
      repo,
      totalContributors: allLogins.size,
      recentCommitCount: allCommits.length,
    };
  }
}
