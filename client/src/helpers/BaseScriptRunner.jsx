class BaseScriptRunner {
  constructor(db, mode) {
    this.db = db;
    this.mode = mode;
    this.events = {};
  }

  on(event, callback) {
    this.events[event] = callback;
    return this;
  }
}

export default BaseScriptRunner;
