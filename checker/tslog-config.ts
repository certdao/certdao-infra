import * as dotenv from 'dotenv';
import { Logger, TLogLevelName } from 'tslog';

dotenv.config();

let LOG_LEVEL: TLogLevelName = "info";
if (process.env.LOG_LEVEL) {
  LOG_LEVEL = process.env.LOG_LEVEL as TLogLevelName;
}

const logger: Logger = new Logger({
  name: "certdao-infra",
  minLevel: LOG_LEVEL,
});

export default logger;
