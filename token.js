
module.exports = class Token {
  constructor(lineNum, tokenId, {word, section, week, lemma, pos, other}){
    this.lineNum = lineNum;
    this.id      = tokenId;

    this.word    = word;
    this.section = section;
    this.week    = week;
    this.lemma   = lemma;
    this.pos     = pos;

    this.other = other;
  }

  toString(){

    return [
      this.word,
      this.section,
      this.week,
      this.lemma,
      this.pos,
      ...this.other
    ].join('\t');
  }
};

