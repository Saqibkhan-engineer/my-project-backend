import { Controller, Post, Get, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { CommitteeService } from './committee.service';

@Controller('committee')
export class CommitteeController {
  constructor(private readonly service: CommitteeService) {}

  // Auto-generate committees + assign groups
  @Post('auto-generate')
  autoGenerate(@Body() body: { reassignGroups?: boolean }) {
    return this.service.autoGenerate({ reassignGroups: body?.reassignGroups ?? false });
  }

  // Get all committees (enriched with member + group details)
  @Get('all')
  getAll() {
    return this.service.getAll();
  }

  // Get single committee
  @Get(':id')
  getById(@Param('id') id: number) {
    return this.service.getById(Number(id));
  }

  // Get committee for a supervisor
  @Get('by-supervisor/:supervisorId')
  getBySupervisor(@Param('supervisorId') supervisorId: number) {
    return this.service.getBySupervisor(Number(supervisorId));
  }

  // Get committee for a group (student use)
  @Get('by-group/:groupId')
  getByGroup(@Param('groupId') groupId: number) {
    return this.service.getByGroup(Number(groupId));
  }

  // Get all groups not yet assigned to any committee
  @Get('admin/unassigned-groups')
  getUnassignedGroups() {
    return this.service.getUnassignedGroups();
  }

  // Get all supervisors not yet in any committee
  @Get('admin/unassigned-supervisors')
  getUnassignedSupervisors() {
    return this.service.getUnassignedSupervisors();
  }

  // Edit committee members (3-4 supervisors)
  @Patch(':id/edit-members')
  editMembers(@Param('id') id: number, @Body('memberIds') memberIds: number[]) {
    return this.service.editMembers(Number(id), memberIds);
  }

  // Assign groups to committee (3-6 groups)
  @Patch(':id/assign-groups')
  assignGroups(@Param('id') id: number, @Body('groupIds') groupIds: number[]) {
    return this.service.assignGroups(Number(id), groupIds);
  }

  // Rename committee
  @Patch(':id/rename')
  rename(@Param('id') id: number, @Body('name') name: string) {
    return this.service.rename(Number(id), name);
  }

  // Delete committee
  @Delete(':id')
  deleteCommittee(@Param('id') id: number) {
    return this.service.deleteCommittee(Number(id));
  }

  // Send emails — all committees or specific one
  @Post('send-emails')
  sendEmails(@Body('committeeId') committeeId?: number) {
    return this.service.sendEmails(committeeId);
  }
}
