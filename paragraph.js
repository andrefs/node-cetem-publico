

module.exports = class Paragraph {
  constructor(parId, sents){
    this.id = parId;
    this.sents = sents;
  }

  toString(){
    return `<p par=${this.id}>\n`
      + this.sents.map(s => s.toString()).join('')
      + '</p>\n';
  }
};
