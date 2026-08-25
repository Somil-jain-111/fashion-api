// ConsoleLogger is a hand-rolled singleton (src/default/logger/console/console.service.ts)
// that services call directly as a static (e.g. `ConsoleLogger.log(...)`), not through
// Nest DI — so it never gets initialized in a unit test unless we do it once, here.
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConsoleLogger } from 'src/default/logger/console/console.service';

ConsoleLogger.initialize(new EventEmitter2());
