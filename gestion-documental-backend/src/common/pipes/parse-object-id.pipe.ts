import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { isObjectIdOrHexString } from 'mongoose';

@Injectable()
export class ParseObjectIdPipe1 implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isObjectIdOrHexString(value)) {
      throw new BadRequestException('El identificador no es válido');
    }
    return value;
  }
}