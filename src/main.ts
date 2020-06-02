import { serve } from '.';
import { parseArgs } from './cli-args';

process.on('uncaughtException', function (e) {
  console.log(e.stack);
  process.exit(1);
});

try {
  const config = parseArgs(process.argv);
  const server = serve(config);

  process.on('SIGINT', function () {
    // graceful shutdown
    server.close(function (err) {
      if (err) {
        console.log(err.stack || err);
      }
      process.exit();
    });
  });
} catch (err) {
  console.error(err?.message);
  process.exit(128);
}
