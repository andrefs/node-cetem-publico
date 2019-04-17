

module.exports = class Sentence {
  constructor(sentId, tokens){
    this.id = sentId;
    this.tokens = tokens;
  }

  toString(){
    return '<s>\n'
      + this.tokens.map(t => t.toString()).join('')
      + '</s>\n';
  }
};
