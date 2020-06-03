import { serve } from '.';
import { parseArgs } from './cli-args';
import * as Logger from './logger';

process.on('uncaughtException', function (e) {
  Logger.error(e.stack);
  process.exit(1);
});

try {
  const config = parseArgs(process.argv);
  const server = serve(config);

  process.on('SIGINT', function () {
    // graceful shutdown
    server.close(function (err) {
      if (err) {
        Logger.error(err.stack || err.toString());
      }
      process.exit();
    });
  });
} catch (err) {
  Logger.error(err?.message);
  process.exit(128);
}
