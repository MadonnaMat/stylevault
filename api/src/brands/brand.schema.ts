import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { resourceSchemaOptions } from '../common/mongo';

@Schema(resourceSchemaOptions(['normalizedName']))
export class Brand {
  @Prop({ type: String, required: true })
  name: string;

  /** `name` trimmed and lowercased. Its unique index enforces name uniqueness. */
  @Prop({ type: String, required: true, unique: true })
  normalizedName: string;
}

export type BrandDocument = HydratedDocument<Brand>;
export const BrandSchema = SchemaFactory.createForClass(Brand);
