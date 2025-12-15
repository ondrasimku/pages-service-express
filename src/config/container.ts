import 'reflect-metadata';
import { Container } from 'inversify';
import { DataSource } from 'typeorm';
import { TYPES } from '../types/di.types';
import { ILogger } from '../logging/logger.interface';
import { PinoLoggerService } from '../logging/pino.logger';
import { IHealthService, HealthService } from '../services/healthService';
import { HealthController } from '../controllers/healthController';
import { IPageRepository, PageRepository } from '../repositories/pageRepository';
import { IFolderRepository, FolderRepository } from '../repositories/folderRepository';
import { IPageLinkRepository, PageLinkRepository } from '../repositories/pageLinkRepository';
import { IBinRepository, BinRepository } from '../repositories/binRepository';
import { IPageService, PageService } from '../services/pageService';
import { IFolderService, FolderService } from '../services/folderService';
import { IPageLinkService, PageLinkService } from '../services/pageLinkService';
import { IBinService, BinService } from '../services/binService';
import { PageController } from '../controllers/pageController';
import { FolderController } from '../controllers/folderController';
import { BinController } from '../controllers/binController';
import AppDataSource from './database';

const container = new Container();

container.bind<DataSource>(TYPES.DataSource).toConstantValue(AppDataSource);
container.bind<ILogger>(TYPES.Logger).to(PinoLoggerService).inSingletonScope();
container.bind<IHealthService>(TYPES.HealthService).to(HealthService);
container.bind<HealthController>(TYPES.HealthController).to(HealthController);
container.bind<IPageRepository>(TYPES.PageRepository).to(PageRepository);
container.bind<IFolderRepository>(TYPES.FolderRepository).to(FolderRepository);
container.bind<IPageLinkRepository>(TYPES.PageLinkRepository).to(PageLinkRepository);
container.bind<IBinRepository>(TYPES.BinRepository).to(BinRepository);
container.bind<IPageService>(TYPES.PageService).to(PageService);
container.bind<IFolderService>(TYPES.FolderService).to(FolderService);
container.bind<IPageLinkService>(TYPES.PageLinkService).to(PageLinkService);
container.bind<IBinService>(TYPES.BinService).to(BinService);
container.bind<PageController>(TYPES.PageController).to(PageController);
container.bind<FolderController>(TYPES.FolderController).to(FolderController);
container.bind<BinController>(TYPES.BinController).to(BinController);

export default container;

