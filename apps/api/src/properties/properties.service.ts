import { Injectable } from '@nestjs/common';
import { db, properties } from '@tara/db';

@Injectable()
export class PropertiesService {
  /**
   * List all properties.
   * TODO: tenant filtering via withTenant() wrapper (see ADR-0002).
   *       That comes when we wire up auth.
   */
  async listAll() {
    return db.select().from(properties).limit(100);
  }

  /**
   * Count all properties.
   * Useful for the home page "X properties in Zambales" badge later.
   */
  async count(): Promise<number> {
    const rows = await db.select().from(properties);
    return rows.length;
  }
}
