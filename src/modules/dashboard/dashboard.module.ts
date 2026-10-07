import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

import { User, UserSchema } from '../users/schemas/user.schema';
import { Team, TeamSchema } from '../teams/schemas/team.schema';
import { Branch, BranchSchema } from '../branches/schemas/branch.schema';
import {
  Department,
  DepartmentSchema,
} from '../departments/schemas/department.schema';
import { Role, RoleSchema } from '../roles/schemas/role.schema';
import {
  NotionPage,
  NotionPageSchema,
} from '../notion-pages/schemas/notion-page.schema';
import { Lead, LeadSchema } from '../leads/schemas/lead.schema';
import { Application, ApplicationSchema } from '../applications/schemas/application.schema';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { LifecycleEvent, LifecycleEventSchema } from '../lifecycle-events/schemas/lifecycle-event.schema';
import { StageHistory, StageHistorySchema } from '../stage-history/schemas/stage-history.schema';
import { FollowUp, FollowUpSchema } from '../follow-ups/schemas/follow-up.schema';

import { SlaConfigModule } from '../sla-config/sla-config.module';

@Module({
  imports: [
    SlaConfigModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Team.name, schema: TeamSchema },
      { name: Branch.name, schema: BranchSchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: Role.name, schema: RoleSchema },
      { name: NotionPage.name, schema: NotionPageSchema },
      { name: Lead.name, schema: LeadSchema },
      { name: Application.name, schema: ApplicationSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: LifecycleEvent.name, schema: LifecycleEventSchema },
      { name: StageHistory.name, schema: StageHistorySchema },
      { name: FollowUp.name, schema: FollowUpSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
