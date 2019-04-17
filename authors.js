

module.exports = class Authors {
  constructor(tokens){
    this.tokens = tokens;
  }

  toString(){
    return '<a>\n'
      + this.tokens.map(t => t.toString()).join('')
      + '</a>\n';
  }
};
