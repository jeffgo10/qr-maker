import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('QrController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  it('/qr/generate (POST)', () => {
    return request(app.getHttpServer())
      .post('/qr/generate')
      .field('value', 'https://example.com')
      .field('size', '256')
      .expect(201)
      .expect('Content-Type', /image\/png/);
  });

  afterEach(async () => {
    await app.close();
  });
});
