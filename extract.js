

module.exports = class Extract {
  constructor({n, sec, sem}, contents){
    this.n = n;
    this.section = sec;
    this.week = sem;
    this.contents = contents;
  }

  toString(){
    return `<ext n=${this.n} sec=${this.section} sem=${this.week}>\n`
      + this.contents.map(c => c.toString()).join('')
      + '</ext>'
  }
};
