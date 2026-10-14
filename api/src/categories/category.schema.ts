import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SLOTS, type Slot } from '@stylevault/shared';
import { HydratedDocument } from 'mongoose';
import { resourceSchemaOptions } from '../common/mongo';

@Schema(resourceSchemaOptions(['normalizedName']))
export class Category {
  @Prop({ type: String, required: true })
  name: string;

  /** `name` trimmed and lowercased. Its unique index enforces name uniqueness. */
  @Prop({ type: String, required: true, unique: true })
  normalizedName: string;

  @Prop({ type: String, required: true, enum: SLOTS })
  slot: Slot;
}

export type CategoryDocument = HydratedDocument<Category>;
export const CategorySchema = SchemaFactory.createForClass(Category);
