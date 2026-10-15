import {
  Controller, Post, UploadedFile, UploadedFiles, UseInterceptors,
  Body, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { TicketsService } from './tickets.service';
import { ParsedTicket } from './ticket-parser.service';

const MAX_FILES = 30;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const pdfStorage = diskStorage({
  destination: './uploads',
  filename: (_, file, cb) => {
    // Date.now() alone collides when many files land in the same millisecond.
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${extname(file.originalname)}`);
  },
});

const pdfFileFilter = (_: any, file: Express.Multer.File, cb: any) => {
  if (file.mimetype === 'application/pdf') cb(null, true);
  else cb(new BadRequestException('Only PDF files are allowed'), false);
};

const uploadOptions = {
  storage: pdfStorage,
  fileFilter: pdfFileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
};

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', uploadOptions))
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    const parsed = await this.ticketsService.parse(file.path);
    return { parsed, filePath: file.path };
  }

  @Post('upload-many')
  @UseInterceptors(FilesInterceptor('files', MAX_FILES, uploadOptions))
  async uploadMany(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files?.length) throw new BadRequestException('No files uploaded');
    return this.ticketsService.parseMany(files);
  }

  @Post('confirm')
  async confirm(@Body() body: { parsed: ParsedTicket }) {
    return this.ticketsService.confirm(body.parsed);
  }

  @Post('confirm-many')
  async confirmMany(@Body() body: { parsed: ParsedTicket[] }) {
    const list = Array.isArray(body?.parsed) ? body.parsed : [];
    if (!list.length) throw new BadRequestException('No tickets provided');
    return this.ticketsService.confirmMany(list);
  }
}
