import { createServer } from 'http';

export function serve(port: number) {
    const server = createServer((_request, response) => {
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify(hello('world')));
    });
    server.listen(port);
    console.log('Server starting..');
    return server;
}

export function hello(name: string) {
    return { message: `hello ${name}` };
}
