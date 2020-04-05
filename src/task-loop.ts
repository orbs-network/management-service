import { errorString } from './utils';

export class TaskLoop {
    private handle: NodeJS.Timeout;
    private started = false;
    constructor(private task: () => Promise<unknown>, private pause: number) {
        this.handle = setTimeout(this.runTask, this.pause);
    }

    runTask = () => {
        this.task().then(
            () => {
                if (this.started) {
                    this.handle = setTimeout(this.runTask, this.pause);
                }
            },
            (e) => {
                console.error(`Error polling for events: ${errorString(e)}`);
            }
        );
    };

    start = () => {
        if (!this.started) {
            this.started = true;
            this.handle = setTimeout(this.runTask, this.pause);
        }
    };

    stop = () => {
        this.started = false;
        clearTimeout(this.handle);
    };
}
