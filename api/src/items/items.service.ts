import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Query } from 'mongoose';
import { BrandsService } from '../brands/brands.service';
import { CategoriesService } from '../categories/categories.service';
import { FieldError, unprocessable } from '../common/problem.exception';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { Item, ItemDocument } from './item.schema';
import { ItemView, toItemView } from './item.view';

@Injectable()
export class ItemsService {
  constructor(
    @InjectModel(Item.name) private readonly items: Model<Item>,
    private readonly categories: CategoriesService,
    private readonly brands: BrandsService,
  ) {}

  async create(dto: CreateItemDto): Promise<ItemView> {
    await this.checkReferences(dto);
    const item = await this.items.create({
      name: dto.name,
      categoryId: dto.categoryId,
      brandId: dto.brandId ?? null,
      primaryColor: dto.primaryColor,
      secondaryColor: dto.secondaryColor ?? null,
      seasons: dto.seasons ?? [],
      occasions: dto.occasions ?? [],
      notes: dto.notes || null,
    });
    return this.findOne(item.id);
  }

  /** Every item, newest first. */
  async findAll(): Promise<ItemView[]> {
    const items = await populate(this.items.find().sort({ createdAt: -1, _id: -1 })).exec();
    return items.map(toItemView);
  }

  async findOne(id: string): Promise<ItemView> {
    const item = await populate(this.items.findById(id)).exec();
    if (!item) throw notFound();
    return toItemView(item);
  }

  /** Applies only the fields present in `dto`. A rejected update leaves the item unchanged. */
  async update(id: string, dto: UpdateItemDto): Promise<ItemView> {
    const item = await this.items.findById(id).exec();
    if (!item) throw notFound();
    await this.checkReferences(dto);

    // DTO instances declare every field, so absent ones are present as `undefined`.
    const { notes, ...fields } = dto;
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) item.set(key, value);
    }
    if (notes !== undefined) item.notes = notes || null;
    await item.save();
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.items.findByIdAndDelete(id).exec();
    if (!deleted) throw notFound();
  }

  private async checkReferences(dto: { categoryId?: string; brandId?: string | null }): Promise<void> {
    const errors: FieldError[] = [];
    if (dto.categoryId !== undefined && !(await this.categories.exists(dto.categoryId))) {
      errors.push({ field: 'categoryId', message: 'category not found' });
    }
    if (dto.brandId && !(await this.brands.exists(dto.brandId))) {
      errors.push({ field: 'brandId', message: 'brand not found' });
    }
    if (errors.length > 0) {
      const detail = errors.map((e) => e.message[0].toUpperCase() + e.message.slice(1)).join('. ') + '.';
      throw unprocessable(detail, errors);
    }
  }
}

function populate<R>(query: Query<R, ItemDocument>) {
  return query.populate('categoryId', 'name slot').populate('brandId', 'name');
}

function notFound() {
  return new NotFoundException('Item not found.');
}
