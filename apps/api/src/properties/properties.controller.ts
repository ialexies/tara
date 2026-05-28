import { Body, Controller, Get, Param, Patch, Post, UseGuards, HttpCode } from '@nestjs/common';
import { PropertiesService } from './properties.service.js';
import { FirebaseGuard } from '../auth/firebase.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthedUser } from '../auth/firebase.guard.js';
import { CreatePropertySchema, UpdatePropertySchema } from '@tara/schemas';
import { UploadsService } from '../uploads/uploads.service.js';
import { z } from 'zod';

const UploadUrlSchema = z.object({
  contentType: z.string(),
  contentLength: z.number().int().positive(),
});

@Controller('properties')
export class PropertiesController {
  constructor(
    private readonly svc: PropertiesService,
    private readonly uploads: UploadsService,
  ) {}

  /** Public — active properties for the guest listing page. */
  @Get()
  async list() {
    const items = await this.svc.listActive();
    return { data: items, meta: { count: items.length } };
  }

  /** Owner — list properties I own. */
  @Get('mine')
  @UseGuards(FirebaseGuard, RolesGuard)
  @Roles('owner', 'admin')
  async listMine(@CurrentUser() user: AuthedUser) {
    const items = await this.svc.listByOwner(user);
    return { data: items, meta: { count: items.length } };
  }

  /** Public — property detail by slug (active only). */
  @Get('slug/:slug')
  async getBySlug(@Param('slug') slug: string) {
    return this.svc.getBySlug(slug);
  }

  /** Owner — get a single owned property by id. */
  @Get(':id')
  @UseGuards(FirebaseGuard, RolesGuard)
  @Roles('owner', 'admin')
  async getOne(@Param('id') id: string, @CurrentUser() user: AuthedUser) {
    return this.svc.getOwnedById(id, user);
  }

  /** Owner — create a new property (starts as draft). */
  @Post()
  @UseGuards(FirebaseGuard, RolesGuard)
  @Roles('owner', 'admin')
  async create(@Body() body: unknown, @CurrentUser() user: AuthedUser) {
    const input = CreatePropertySchema.parse(body);
    return this.svc.create(input, user);
  }

  /** Owner — update editable property fields. */
  @Patch(':id')
  @UseGuards(FirebaseGuard, RolesGuard)
  @Roles('owner', 'admin')
  async update(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthedUser) {
    const input = UpdatePropertySchema.parse(body);
    return this.svc.update(id, input, user);
  }

  /** Owner — get a presigned R2 upload URL for the cover image. */
  @Post(':id/upload-url')
  @HttpCode(200)
  @UseGuards(FirebaseGuard, RolesGuard)
  @Roles('owner', 'admin')
  async getUploadUrl(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthedUser,
  ) {
    await this.svc.getOwnedById(id, user);
    const { contentType } = UploadUrlSchema.parse(body);
    const ext = contentType.split('/')[1] ?? 'jpg';
    const key = `properties/${id}/cover.${ext}`;
    return this.uploads.presignUpload({ key, contentType });
  }

  /** Owner — save cover image URL after upload. */
  @Patch(':id/cover-image')
  @UseGuards(FirebaseGuard, RolesGuard)
  @Roles('owner', 'admin')
  async saveCoverImage(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthedUser,
  ) {
    const { url } = z.object({ url: z.string().url() }).parse(body);
    return this.svc.update(id, { coverImageUrl: url }, user);
  }

  /** Owner — publish a draft property (requires ≥1 active room). */
  @Post(':id/publish')
  @HttpCode(200)
  @UseGuards(FirebaseGuard, RolesGuard)
  @Roles('owner', 'admin')
  async publish(@Param('id') id: string, @CurrentUser() user: AuthedUser) {
    return this.svc.publish(id, user);
  }

  /** Owner — take a property back to draft. */
  @Post(':id/unpublish')
  @HttpCode(200)
  @UseGuards(FirebaseGuard, RolesGuard)
  @Roles('owner', 'admin')
  async unpublish(@Param('id') id: string, @CurrentUser() user: AuthedUser) {
    return this.svc.unpublish(id, user);
  }
}
