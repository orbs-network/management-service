import { serve } from '.';
import { parseOptions } from './cli-options';

process.on('uncaughtException', function (e) {
    console.log(e.stack);
    process.exit(1);
});

try {
    const config = parseOptions(process.argv);
    const server = serve(8080, config);

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
