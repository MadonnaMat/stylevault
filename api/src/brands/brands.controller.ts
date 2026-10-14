import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ObjectIdPipe } from '../common/mongo';
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

const BrandId = new ObjectIdPipe('Brand');

@Controller('brands')
export class BrandsController {
  constructor(private readonly brands: BrandsService) {}

  @Post()
  async create(@Body() dto: CreateBrandDto, @Res({ passthrough: true }) res: Response) {
    const brand = await this.brands.create(dto);
    res.location(`/api/brands/${brand.id}`);
    return brand;
  }

  @Get()
  findAll() {
    return this.brands.findAll();
  }

  @Patch(':id')
  update(@Param('id', BrandId) id: string, @Body() dto: UpdateBrandDto) {
    return this.brands.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', BrandId) id: string) {
    return this.brands.remove(id);
  }
}
