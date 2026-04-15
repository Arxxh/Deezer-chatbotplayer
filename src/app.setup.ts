import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';

export function configureApp(app: INestApplication) {
  // Toda configuracion transversal vive aqui para que `main.ts`
  // se mantenga pequeno y facil de leer.
  const configService = app.get(ConfigService);
  const frontendUrl =
    configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';

  app.enableCors({
    // CORS
    origin: frontendUrl,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // sirve para enviar cookies en solicitudes CORS
  });

  app.use(helmet()); // Helmet ayuda a proteger la app de vulnerabilidades comunes. (headers) (seguridad)
  app.setGlobalPrefix('api/v1');

  // El ValidationPipe limpia el payload y valida DTOs anotados del exterior. Si el payload no cumple con las reglas del DTO, se lanza un error automáticamente. (seguridad)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Elimina propiedades que no están en el DTO.
      forbidNonWhitelisted: true, // Lanza error si hay propiedades no permitidas.
      transform: true, // Transforma payloads a los tipos definidos en los DTOs.
    }),
  );
}
