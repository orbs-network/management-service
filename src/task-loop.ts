import * as Logger from './logger';
import { errorString } from './utils';

export class TaskLoop {
    private handle: NodeJS.Timeout | undefined;
    private started = false;
    constructor(private task: () => Promise<unknown>, private pause: number) {}

    runTask = () => {
        // TODO: handle exceptions in task()
        this.task().then(
            () => {
                if (this.started) {
                    this.handle = setTimeout(this.runTask, this.pause);
                }
            },
            (e) => {
                Logger.error(`Error in runTask: ${errorString(e)}.`);
                if (this.started) {
                    this.handle = setTimeout(this.runTask, this.pause);
                }
            }
        );
    };

    start = () => {
        if (!this.started) {
            this.started = true;
            this.handle = setTimeout(this.runTask, 0);
        }
    };

    stop = () => {
        this.started = false;
        if (this.handle !== undefined) {
            clearTimeout(this.handle);
        }
    };
}
