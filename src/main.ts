import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');


  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
    credentials: false,
  });

  await app.listen(3000, '0.0.0.0', () => {
    console.log('Server running on port 3000');


  });

  console.log('the server is running on port' + (process.env.PORT ?? 3000));
 

}
bootstrap();

