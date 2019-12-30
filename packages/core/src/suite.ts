import Result, { Status } from './result';
import Runnable, { isRunnable, RunnableTypes } from './runnable';

export const isSuite = (v: unknown): v is Suite => {
  if (!isRunnable(v)) { return false; }
  return v.type === RunnableTypes.Suite;
};
export const rootSymbol = Symbol('isRoot');

export default class Suite extends Runnable {
  public children: Runnable[];
  public [rootSymbol]?: boolean;
  public type = RunnableTypes.Suite;

  constructor(description: string, skip?: boolean, parent?: Suite) {
    super(description, skip || false, parent);
    this.children = [];
  }

  /**
   * @description Add a `Runnable` to the `children` array.
   * @param {Runnable} child
   * @returns {Void}
   */
  public addChild(child: Runnable): void {
    child.parent = this;
    this.children.push(child);
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
    if (this.skip) {
      return this.doSkip();
    }

    this.doStart();

    for (const child of this.children) {
      const result = child.run();
      this.result.addMessages(...result.messages);
      if (result.status === Status.Failed) { // TODO: make bail optional
        return this.doFail();
      }
    }

    return this.doPass();
  }

  // TODO: return total number of tests/suites
  public getTotal(): number {
    return this.children.length;
  }

  // TODO: real asyncRun using EventEmitters or Promise
}
