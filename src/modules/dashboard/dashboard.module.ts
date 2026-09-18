import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

import { User, UserSchema } from '../users/schemas/user.schema';
import { Team, TeamSchema } from '../teams/schemas/team.schema';
import { Branch, BranchSchema } from '../branches/schemas/branch.schema';
import { Department, DepartmentSchema } from '../departments/schemas/department.schema';
import { Role, RoleSchema } from '../roles/schemas/role.schema';
import { NotionPage, NotionPageSchema } from '../notion-pages/schemas/notion-page.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Team.name, schema: TeamSchema },
      { name: Branch.name, schema: BranchSchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: Role.name, schema: RoleSchema },
      { name: NotionPage.name, schema: NotionPageSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
