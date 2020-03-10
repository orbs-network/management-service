import { serve } from '.';
import { parseOptions } from './cli-options';

try {
    const config = parseOptions(process.argv);
    serve(8080, config);
} catch (err) {
    console.error(err?.message);
    process.exit(128);
}
