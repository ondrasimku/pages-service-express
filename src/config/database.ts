import { DataSource } from 'typeorm';
import config from './config';
import { Page } from '../models/page';
import { Folder } from '../models/folder';
import { PageLink } from '../models/pageLink';
import { BinItem } from '../models/binItem';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.database,
  synchronize: false,
  logging: false,
  entities: [Page, Folder, PageLink, BinItem],
  migrations: [__dirname + "/../migrations/*.{ts,js}"],
  migrationsTableName: "pages_service_migrations",
  subscribers: [],
});

export default AppDataSource;

