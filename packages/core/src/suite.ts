import Result, { Status } from './result';
import Runnable, { isRunnable, RunnableOptions, RunnableTypes } from './runnable';
import Test, { isTest } from './test';

export const isSuite = (v: unknown): v is Suite => {
  if (!isRunnable(v)) { return false; }
  return v.type === RunnableTypes.Suite;
};
export const rootSymbol = Symbol('isRoot');

export interface Stats {
  total: number;
  pending: number;
  running: number;
  done: number;
  passed: number;
  failed: number;
  skipped: number;
  todo: number;
  time: number;
}

export interface SuiteOptions extends RunnableOptions {
  bail: boolean;
}

export default class Suite extends Runnable {
  public children: Runnable[];
  public [rootSymbol]?: boolean;
  public type = RunnableTypes.Suite;
  public options: SuiteOptions;

  constructor(description: string, options: Partial<SuiteOptions> = {}, parent?: Suite | null) {
    super(description, options, parent);
    this.options = {
      bail: false,
      ...Runnable.normalizeOptions(options),
    };
    this.children = [];
  }

  /**
   * @description Add one or more `Runnable` instances to the `children` array.
   * @param {Runnable[]} ...children
   * @returns {Void}
   */
  public addChildren(...children: Runnable[]): void {
    for (const child of children) {
      child.parent = this;
    }
    this.children.push(...children);
  }

  /**
   * @description Check that `Suite` is the root suite
   * @public
   * @return {boolean}
   */
  public isRoot(): boolean {
    return Boolean(this[rootSymbol]);
  }

  /**
   * @description Runs a `Suite` instance returning a `Result`:
   * @public
   * @returns {Result}
   */
  public run(): Result {
    if (this.options.skip || this.options.todo) {
      return this.doSkip(this.options.todo);
    }

    this.doStart();
    let failed = false;

    for (const child of this.children) {
      const result = child.run();
      this.result.addMessages(...result.messages.map((m) => `${child.description}: ${m}`));
      if (result.status === Status.Failed) {
        if (this.options.bail) {
          return this.doFail();
        }
        failed = true;
      }
    }

    if (failed) {
      return this.doFail();
    }
    return this.doPass();
  }

  /**
   * @description Runs a `Suite` instance asynchronously returning a `Result`:
   * @public
   * @returns {Promise<Result>}
   */
  public async asyncRun(): Promise<Result> {
    if (this.options.skip || this.options.todo) {
      return this.doSkip(this.options.todo);
    }

    this.doStart();

    const promises: Array<Promise<Result>> = [];
    for (const child of this.children) {
      promises.push(child.asyncRun().then((r) => {
        this.result.addMessages(...r.messages.map((m) => `${child.description}: ${m}`));
        return r;
      }).catch((e) => {
        this.doFail(`${child.description}: ${e}`); // TODO: make bail for async
        throw e;
      }));
    }

    await Promise.all(promises);
    return this.doPass();
  }

  /**
   * @description Returns `Suite` stats in a `Stats` object
   * @public
   * @returns {Stats}
   */
  public getStats(): Stats {
    return {
      done: this.flatten(this.children).filter((c) => c.result.isDone()).length,
      failed: this.flatten(this.children).filter((c) => c.result.status === Status.Failed).length,
      passed: this.flatten(this.children).filter((c) => c.result.status === Status.Passed).length,
      pending: this.flatten(this.children).filter((c) => c.result.status === Status.Pending).length,
      running: this.flatten(this.children).filter((c) => c.result.status === Status.Running).length,
      skipped: this.flatten(this.children).filter((c) => c.result.status === Status.Skipped).length,
      time: this.time,
      todo: this.flatten(this.children).filter((c) => c.result.status === Status.Todo).length,
      total: this.flatten(this.children).length,
    };
  }

  private flatten(array: Runnable[]): Runnable[] {
    const flatTree: Runnable[] = [];
    for (const child of array) {
      if (isSuite(child)) {
        flatTree.push(...this.flatten(child.children));
        continue;
      }
      flatTree.push(child);
    }

    return flatTree;
  }
}
