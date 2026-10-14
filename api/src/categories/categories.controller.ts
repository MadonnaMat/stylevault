import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ObjectIdPipe } from '../common/mongo';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

const CategoryId = new ObjectIdPipe('Category');

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Post()
  async create(@Body() dto: CreateCategoryDto, @Res({ passthrough: true }) res: Response) {
    const category = await this.categories.create(dto);
    res.location(`/api/categories/${category.id}`);
    return category;
  }

  @Get()
  findAll() {
    return this.categories.findAll();
  }

  @Patch(':id')
  update(@Param('id', CategoryId) id: string, @Body() dto: UpdateCategoryDto) {
    return this.categories.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', CategoryId) id: string) {
    return this.categories.remove(id);
  }
}
