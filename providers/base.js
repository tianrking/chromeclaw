export class BaseProvider {
  constructor(name) {
    this.name = name;
  }

  async complete(_input) {
    throw new Error('complete() not implemented');
  }
}
