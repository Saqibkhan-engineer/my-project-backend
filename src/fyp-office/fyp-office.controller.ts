import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FypOfficeService } from './fyp-office.service';

@Controller('fyp-office')
export class FypOfficeController {
  constructor(private readonly service: FypOfficeService) {}

  
  @Post('save-proposal')
  @UseInterceptors(FileInterceptor('file'))
  uploadExisting(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {console.log("fyp office")
    return this.service.saveProposal(body, file);
  }
}
