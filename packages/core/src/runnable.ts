import Result, { Status } from './result';

/**
 * @class
 * @param {String} description
 * @param {Function} fn
 */

export default class Runnable {
  public description: string;
  public fn: () => any;
  public skip: boolean;
  public result: Result;

  constructor(description: string, fn: () => any, skip = false) {
    this.description = description;
    this.fn = fn;
    this.result = new Result();
    this.skip = skip;
  }

  /**
   * Run a `Runnable` instance return `Runnable` status:
   * @public
   * @return {Result}
   */
  public run(): Result {
    if (this.skip) {
      this.result.status = Status.Skipped;
      return this.result;
    }

    try {
      this.fn();
    } catch (error) {
      if (error.name === 'ExpectError') {
        this.result.addMessages(String(error));
        this.result.status = Status.Failed;
      } else {
        this.result.addMessages(String(error));
        this.result.status = Status.Errored;
      }
    }

    this.result.status = Status.Passed; // Will be cancelled if status is already set in catch

    return this.result;
  }

  /**
   * Run asynchronous `Test` or `Suite`:
   * @public
   * @return {Promise}
   */
  public async asyncRun(): Promise<Result> {
    return await this.run();
  }

  /**
   * Check if `Runnable` is done
   * @return {boolean}
   */
  public isDone() {
    return this.result.isDone();
  }
}
