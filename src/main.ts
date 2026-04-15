import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  // `main.ts` solo arranca Nest y delega la configuracion transversal.
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();
  configureApp(app);

  const configService = app.get(ConfigService);
  const configuredPort = configService.get<string>('PORT');
  const parsedPort = Number(configuredPort);
  const port =
    Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 4000;

  await app.listen(port);

  new Logger('Bootstrap').log(`Chat port: ${port}`);
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error(
    'Error critico al lanzar la aplicacion',
    error instanceof Error ? error.stack : String(error),
  );
});
