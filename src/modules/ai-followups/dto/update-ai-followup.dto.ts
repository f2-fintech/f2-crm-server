import { PartialType } from '@nestjs/swagger';
import { CreateAiFollowupDto } from './create-ai-followup.dto';

export class UpdateAiFollowupDto extends PartialType(CreateAiFollowupDto) {}
