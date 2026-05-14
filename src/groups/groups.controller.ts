import { Controller, Get, Param, Body, Patch } from '@nestjs/common';
import { GroupsService } from './groups.service';

@Controller('groups')
export class GroupsController {
  constructor(private readonly groupService: GroupsService) {}

  @Get('my-groups/:supervisorId')
  getMyGroups(@Param('supervisorId') supervisorId: number) {
    return this.groupService.getGroupsBySupervisor(supervisorId);
  }

  @Get('student/:studentId')
  getStudentGroups(@Param('studentId') studentId: number) {
    return this.groupService.getGroupsByStudentId(studentId);
  }

  @Patch('update-repo/:groupId')
  updateRepo(
    @Param('groupId') groupId: number,
    @Body() body: any,
  ) {
    return this.groupService.updateRepo(groupId, body);
  }

  @Get('performance/:groupId')
  getPerformance(@Param('groupId') groupId: number) {
    return this.groupService.checkPerformance(groupId);
  }
}
