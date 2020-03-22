import { serve } from '.';
import { parseOptions } from './cli-options';
import { getHardcodedEthereumConfig } from './ethereum-reader';

process.on('uncaughtException', function(e) {
    console.log(e.stack);
    process.exit(1);
});

try {
    const config = parseOptions(process.argv);
    const ethConfig = getHardcodedEthereumConfig(config.EthereumNetwork);
    const server = serve(8080, config, ethConfig);

    process.on('SIGINT', function() {
        // graceful shutdown
        server.close(function(err) {
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
