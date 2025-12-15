import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ debug: false });

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  dialect: 'postgres';
  logging: boolean;
}

interface JwtConfig {
  publicKey: string;
}

interface Config {
  port: number;
  nodeEnv: string;
  database: DatabaseConfig;
  jwt: JwtConfig;
}

function loadJwtPublicKey(): string {
  const keyPath = process.env.JWT_PUBLIC_KEY_PATH || path.join(__dirname, '..', '..', 'keys', 'public.pem');
  
  if (fs.existsSync(keyPath)) {
    return fs.readFileSync(keyPath, 'utf-8');
  }
  
  if (process.env.JWT_PUBLIC_KEY) {
    return process.env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n');
  }
  
  return '';
}

export const config: Config = {
  port: Number(process.env.PORT) || 3002,
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'pages_service_db',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development',
  },
  jwt: {
    publicKey: loadJwtPublicKey(),
  },
};

export default config;

