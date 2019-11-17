
module.exports = class Token {
  constructor(word, info){
    this.word = word;
    if(info){
      const {lineNum, tokenId, section, week, lemma, pos, other} = info;

      if(lineNum) { this.lineNum = lineNum; }
      if(tokenId) { this.id      = tokenId; }
      if(section) { this.section = section; }
      if(week)    { this.week    = week;    }
      if(lemma)   { this.lemma   = lemma;   }
      if(pos)     { this.pos     = pos;     }

      if(other){ this.other = other; }
    }
  }

  toString(){
    return [
      this.word,
      this.section,
      this.week,
      this.lemma,
      this.pos,
      ...(this.other || [])
    ].join('\t')+'\n';
  }
};


