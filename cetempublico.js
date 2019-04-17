const fs = require('fs')
const readline = require('readline');
const Token = require('./token');
// const MWE = require('./mwe';
const Sentence = require('./sentence');
const Extract = require('./extract');
const Paragraph = require('./paragraph');


const parseAttrs = str => {
  let attrs = {};
  str.split(/\s+/).forEach(attr => {
    x = attr.split(/=/);
    attrs[x[0]] = x[1];
  });
  return attrs;
}

const parseLine = line => {
  const fields = line.split(/\t/);
  return {
    word    : fields[0],
    section : fields[1],
    week    : fields[2],
    lemma   : fields[3],
    pos     : fields[4],
    other   : fields.slice(5)
  };
}

class CETEMPublico {
  constructor(opts = {}){
    this._file = opts.file || 'CETEMPublicoAnotado2019_10k.txt';
    this._rl = readline.createInterface({
      input: fs.createReadStream(this._file)
    });
  }

  lines(){
    return this._rl;
  }

  async * process(iterLevel){
    const levels = {
      ext   : 0,
      par   : 1,
      sent  : 2,
      token : 3,
      line  : 4
    };
    const level = levels[iterLevel];

    const extStartRE = /^\s*<ext\s*(.*)>/;
    const extEndRE   = /^\s*<\/ext>/;
    const parStartRE = /^\s*<p par=(.*)\s*>/;
    const parEndRE   = /^\s*<\/p>/;
    const sentStartRE = /^\s*<s>/;
    const sentEndRE   = /^\s*<\/s>/;

    let lineNum = 0;
    let curExt;
    let curPar;
    let extContents = [];
    let parSents   = [];
    let sentTokens = [];
    let sentCount = 0;
    let tokenCount = 0;

    for await (const line of this.lines()){
      lineNum++;

      if(level === levels.ext && line.match(extStartRE)){
        curExt = parseAttrs(RegExp.$1);
        extContents = [];
        continue;
      }

      if(level === levels.ext && line.match(extEndRE)){
        yield new Extract(curExt, extContents);
      }

      if(line.match(parStartRE)){
        parSents = [];
        sentCount = 0;

        if(level <= levels.par){
          curPar = RegExp.$1;
          continue;
        }
      }

      if(line.match(parEndRE)){
        const par = new Paragraph(curPar, parSents);
        if(level === levels.par){
          yield par;
        }
        else if(level < levels.par){
          extContents.push(par);
        }
      }

      if(line.match(sentStartRE)){
        sentCount++;
        sentTokens = [];
        tokenCount = 0;
        continue;
      }

      if(line.match(sentEndRE)){
        const sent = new Sentence(sentCount, sentTokens);

        if(level === levels.sent){
          yield sent;
        }
        else if (level < levels.sent){
          parSents.push(sent);
        }
      }

      if(line.match(/^<\/?(?:mwe|t|a)/)){
        // TODO handle these
        continue;
      }

      const fields = parseLine(line);
      tokenCount++;
      const token = new Token(lineNum, tokenCount, fields);

      if(level === levels.sent){
        yield token;
      }
      else if (level < levels.sent){
        sentTokens.push(token);
      }
    }
  }
}

module.exports = new CETEMPublico();
