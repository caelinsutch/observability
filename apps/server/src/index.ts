import fastify from 'fastify';
import { env } from './env.js';

const server = fastify({
  logger: {
    level: env.LOG_LEVEL,
    transport: env.NODE_ENV === 'development' 
      ? {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  },
});

server.get('/', async () => {
  return { hello: 'world' };
});

server.get('/health', async () => {
  return { 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  };
});

const start = async () => {
  try {
    await server.listen({ 
      port: env.PORT, 
      host: env.HOST 
    });
    
    server.log.info(`Server listening on http://${env.HOST}:${env.PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();