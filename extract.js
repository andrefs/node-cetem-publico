

module.exports = class Extract {
  constructor({n, sec, sem}, contents){
    this.n = n;
    this.section = sec;
    this.week = sem;
    this.contents = contents;
  }
};
