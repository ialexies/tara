import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PropertiesService } from './properties.service.js';
import { FirebaseGuard } from '../auth/firebase.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthedUser } from '../auth/firebase.guard.js';
import { CreatePropertySchema, UpdatePropertySchema } from '@tara/schemas';
import { UploadsService } from '../uploads/uploads.service.js';
import { EmailService } from '../email/email.service.js';
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
    private readonly email: EmailService,
  ) {}

  /** Public — active properties for the guest listing page. Supports date, amenity, and price filters. */
  @Get()
  @SkipThrottle({ global: true, auth: true, guest_action: true })
  async list(
    @Query('checkIn') checkIn?: string,
    @Query('checkOut') checkOut?: string,
    @Query('amenities') amenities?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('city') city?: string,
    @Query('propertyType') propertyType?: string,
  ) {
    const filters = {
      amenities: amenities ? amenities.split(',').filter(Boolean) : undefined,
      minPrice: minPrice ? parseInt(minPrice, 10) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice, 10) : undefined,
      city: city || undefined,
      propertyType: propertyType || undefined,
    };
    const items =
      checkIn && checkOut
        ? await this.svc.listActiveWithAvailability(checkIn, checkOut, filters)
        : await this.svc.listActive(filters);
    return { data: items, meta: { count: items.length } };
  }

  /** Owner — list properties I own. */
  @Get('mine')
  @SkipThrottle({ global: true, auth: true, guest_action: true })
  @UseGuards(FirebaseGuard, RolesGuard)
  @Roles('owner', 'admin')
  async listMine(@CurrentUser() user: AuthedUser) {
    const items = await this.svc.listByOwner(user);
    return { data: items, meta: { count: items.length } };
  }

  /** Owner — revenue summary across all owned properties. */
  @Get('revenue')
  @SkipThrottle({ global: true, auth: true, guest_action: true })
  @UseGuards(FirebaseGuard, RolesGuard)
  @Roles('owner', 'admin')
  async getRevenue(@CurrentUser() user: AuthedUser) {
    const data = await this.svc.getRevenueSummary(user);
    return { data };
  }

  /** Owner — monthly revenue breakdown across all owned properties. */
  @Get('revenue/monthly')
  @SkipThrottle({ global: true, auth: true, guest_action: true })
  @UseGuards(FirebaseGuard, RolesGuard)
  @Roles('owner', 'admin')
  async getRevenueByMonth(@CurrentUser() user: AuthedUser) {
    const data = await this.svc.getRevenueByMonth(user);
    return { data };
  }

  /** Owner — occupancy report for a specific property (last N months). */
  @Get(':id/occupancy')
  @UseGuards(FirebaseGuard, RolesGuard)
  @Roles('owner', 'admin')
  async getOccupancy(
    @Param('id') id: string,
    @Query('months') months: string,
    @CurrentUser() user: AuthedUser,
  ) {
    const data = await this.svc.getOccupancyReport(id, user, months ? parseInt(months, 10) : 6);
    return { data };
  }

  /** Public — property detail by slug (active only). */
  @Get('slug/:slug')
  @SkipThrottle({ global: true, auth: true, guest_action: true })
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

  /** Public — list images for a property (shown on property page). */
  @Get(':id/images')
  @SkipThrottle({ global: true, auth: true, guest_action: true })
  async listImages(@Param('id') id: string) {
    const data = await this.svc.listPropertyImages(id);
    return { data };
  }

  /** Owner — get presigned URL for a new property image. */
  @Post(':id/images/upload-url')
  @HttpCode(200)
  @UseGuards(FirebaseGuard, RolesGuard)
  @Roles('owner', 'admin')
  async getPropertyImageUploadUrl(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthedUser,
  ) {
    await this.svc.getOwnedById(id, user);
    const { contentType } = UploadUrlSchema.parse(body);
    const ext = contentType.split('/')[1] ?? 'jpg';
    const key = `properties/${id}/images/${Date.now()}.${ext}`;
    return this.uploads.presignUpload({ key, contentType });
  }

  /** Owner — save a new property image. */
  @Post(':id/images')
  @HttpCode(201)
  @UseGuards(FirebaseGuard, RolesGuard)
  @Roles('owner', 'admin')
  async addPropertyImage(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthedUser,
  ) {
    const { url } = z.object({ url: z.string().url() }).parse(body);
    return this.svc.addPropertyImage(id, url, user);
  }

  /** Owner — delete a property image. */
  @Delete(':id/images/:imageId')
  @HttpCode(204)
  @UseGuards(FirebaseGuard, RolesGuard)
  @Roles('owner', 'admin')
  async deletePropertyImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    await this.svc.deletePropertyImage(id, imageId, user);
  }

  /** Public — send a pre-booking enquiry to the property owner. Rate-limited. */
  @Post('slug/:slug/enquiry')
  @HttpCode(200)
  async sendEnquiry(@Param('slug') slug: string, @Body() body: unknown) {
    const { guestName, guestEmail, message } = z
      .object({
        guestName: z.string().min(2).max(120),
        guestEmail: z.string().email(),
        message: z.string().min(10).max(1000),
      })
      .parse(body);

    const prop = await this.svc.getBySlug(slug);
    const webUrl = process.env['WEB_URL'] ?? 'https://tara-stays.com';
    const propertyUrl = `${webUrl}/en/properties/${slug}`;

    const { getFirebaseAdmin } = await import('../auth/firebase-admin.js');
    const ownerEmail = await getFirebaseAdmin()
      .auth()
      .getUser(prop.ownerId)
      .then((u) => u.email ?? null)
      .catch(() => null);

    if (ownerEmail) {
      void this.email.sendPropertyEnquiry(ownerEmail, {
        guestName,
        guestEmail,
        propertyName: prop.name,
        message,
        propertyUrl,
      });
    }

    return { ok: true };
  }

  /** Admin — list all properties across all tenants. */
  @Get('admin/all')
  @UseGuards(FirebaseGuard, RolesGuard)
  @Roles('admin')
  async adminListAll() {
    const data = await this.svc.adminListAll();
    return { data, meta: { count: data.length } };
  }

  /** Admin — set property status. */
  @Post('admin/:id/status')
  @HttpCode(200)
  @UseGuards(FirebaseGuard, RolesGuard)
  @Roles('admin')
  async adminSetStatus(@Param('id') id: string, @Body() body: unknown) {
    const { status } = z
      .object({ status: z.enum(['active', 'suspended', 'paused', 'pending']) })
      .parse(body);
    return this.svc.adminSetStatus(id, status);
  }
}
