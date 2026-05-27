import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RoomsService } from './rooms.service.js';
import { FirebaseGuard } from '../auth/firebase.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthedUser } from '../auth/firebase.guard.js';
import { CreateRoomSchema, UpdateRoomSchema } from '@tara/schemas';
import { UploadsService } from '../uploads/uploads.service.js';
import { z } from 'zod';

const UploadUrlSchema = z.object({
  contentType: z.string(),
  contentLength: z.number().int().positive(),
});

@Controller('properties/:propertyId/rooms')
@UseGuards(FirebaseGuard, RolesGuard)
@Roles('owner', 'admin')
export class RoomsController {
  constructor(
    private readonly svc: RoomsService,
    private readonly uploads: UploadsService,
  ) {}

  @Get()
  async list(@Param('propertyId') propertyId: string, @CurrentUser() user: AuthedUser) {
    const items = await this.svc.listByProperty(propertyId, user);
    return { data: items, meta: { count: items.length } };
  }

  @Post()
  async create(
    @Param('propertyId') propertyId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthedUser,
  ) {
    const input = CreateRoomSchema.parse(body);
    return this.svc.create(propertyId, input, user);
  }

  @Patch(':roomId')
  async update(
    @Param('propertyId') propertyId: string,
    @Param('roomId') roomId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthedUser,
  ) {
    const input = UpdateRoomSchema.parse(body);
    return this.svc.update(propertyId, roomId, input, user);
  }

  @Post(':roomId/upload-url')
  @HttpCode(200)
  async getRoomUploadUrl(
    @Param('propertyId') propertyId: string,
    @Param('roomId') roomId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthedUser,
  ) {
    await this.svc.assertOwned(propertyId, roomId, user);
    const { contentType, contentLength } = UploadUrlSchema.parse(body);
    const ext = contentType.split('/')[1] ?? 'jpg';
    const key = `rooms/${roomId}/cover.${ext}`;
    return this.uploads.presignUpload({ key, contentType, contentLength });
  }

  @Patch(':roomId/cover-image')
  async saveRoomCoverImage(
    @Param('propertyId') propertyId: string,
    @Param('roomId') roomId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthedUser,
  ) {
    const { url } = z.object({ url: z.string().url() }).parse(body);
    return this.svc.update(propertyId, roomId, { coverImageUrl: url }, user);
  }

  @Delete(':roomId')
  @HttpCode(204)
  async remove(
    @Param('propertyId') propertyId: string,
    @Param('roomId') roomId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    await this.svc.remove(propertyId, roomId, user);
  }
}
