

module.exports = class Title {
  constructor(tokens){
    this.tokens = tokens;
  }

  toString(){
    return '<t>\n'
      + this.tokens.map(t => t.toString()).join('')
      + '</t>\n';
  }
};
