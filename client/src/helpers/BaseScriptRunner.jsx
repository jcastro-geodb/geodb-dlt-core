class BaseScriptRunner {
  constructor(db, mode) {
    this.db = db;
    this.mode = mode;
  }

  on(event, callback) {
    if (this.events === undefined) this.events = {};
    this.events[event] = callback;
    return this;
  }
}

export default BaseScriptRunner;
