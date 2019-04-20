

module.exports = class Sentence {
  constructor(sentId, tokens){
    this.id = sentId;
    this._tokens = tokens;
  }

  get tokens(){
    return this._tokens;
  }

  set tokens(ts){
    this._tokens = ts;
  }

  get length(){
    return this._tokens.length;
  }

  toString(){
    return '<s>\n'
      + this._tokens.map(t => t.toString()).join('')
      + '</s>\n';
  }
};
