import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { OCCASIONS, SEASONS, type Occasion, type Season } from '@stylevault/shared';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { Brand } from '../brands/brand.schema';
import { Category } from '../categories/category.schema';

@Schema({ timestamps: true })
export class Item {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Category.name, required: true, index: true })
  categoryId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Brand.name, default: null, index: true })
  brandId: Types.ObjectId | null;

  /** Lowercase `#rrggbb`. */
  @Prop({ type: String, required: true })
  primaryColor: string;

  /** Lowercase `#rrggbb`, or null for none. */
  @Prop({ type: String, default: null })
  secondaryColor: string | null;

  @Prop({ type: [String], enum: SEASONS, default: [] })
  seasons: Season[];

  @Prop({ type: [String], enum: OCCASIONS, default: [] })
  occasions: Occasion[];

  @Prop({ type: String, default: null })
  notes: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export type ItemDocument = HydratedDocument<Item>;
export const ItemSchema = SchemaFactory.createForClass(Item);
