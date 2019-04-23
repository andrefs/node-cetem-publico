

module.exports = class MultiWordExpression {
  constructor({lema, pos}, tokens){
    this.lemma = lema;
    this.pos = pos;
    this.tokens = tokens;
  }

  toString(){
    return `<mwe lema=${this.lemma} pos=${this.pos}>\n`
      + this.tokens.map(t => t.toString()).join('')
      + '</mwe>\n'
  }
};
