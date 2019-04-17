const fs = require('fs')
const readline = require('readline');
const Token = require('./token');
const MultiWordExpression = require('./mwe');
const Title    = require('./title');
const Authors  = require('./authors');
const Sentence = require('./sentence');
const Extract = require('./extract');
const Paragraph = require('./paragraph');


const extStartRE = /^\s*<ext\s*(.*)>/;
const extEndRE   = /^\s*<\/ext>/;

const parStartRE = /^\s*<p par=(.*)\s*>/;
const parEndRE   = /^\s*<\/p>/;

const sentStartRE = /^\s*<s>/;
const sentEndRE   = /^\s*<\/s>/;

const titleStartRE = /^\s*<t>/;
const titleEndRE   = /^\s*<\/t>/;

const authorsStartRE = /^\s*<a>/;
const authorsEndRE   = /^\s*<\/a>/;

const mweStartRE = /^\s*<mwe\s*(.*)>/;
const mweEndRE   = /^\s*<\/mwe>/;

const parseExtAttrs = str => {
  let attrs = {};
  str.split(/\s+/).forEach(attr => {
    x = attr.split(/=/);
    attrs[x[0]] = x[1];
  });
  return attrs;
}


const parseMweAttrs = str => {
  let attrs = {};
  str.split(/\s+/).forEach(attr => {
    attr.match(/^(\w+)=(.*)/);
    attrs[RegExp.$1] = RegExp.$2;
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


    let lineNum = 0;
    let curExt;
    let curPar;
    let extContents = [];
    let parSents   = [];
    let sentTokens = [];
    let sentCount = 0;
    let tokenCount = 0;
    let insideMWE = false;
    let mweTokens = [];
    let curMwe;

    for await (const line of this.lines()){
      lineNum++;

      // Extract

      if(level === levels.ext && line.match(extStartRE)){
        curExt = parseExtAttrs(RegExp.$1);
        extContents = [];
        continue;
      }

      if(level === levels.ext && line.match(extEndRE)){
        const ext = new Extract(curExt, extContents);
        extContents = [];

        yield ext;

        continue;
      }


      // Title

      if(line.match(titleStartRE)){
        sentTokens = [];
        tokenCount = 0;

        continue;
      }

      if(line.match(titleEndRE)){
        const title = new Title(sentTokens);
        sentTokens = [];
        tokenCount = 0;

        if(level === levels.par)   { yield title;             }
        else if(level < levels.par){ extContents.push(title); }

        continue;
      }


      // Authors

      if(line.match(authorsStartRE)){
        sentTokens = [];
        tokenCount = 0;

        continue;
      }

      if(line.match(authorsEndRE)){
        const authors = new Authors(sentTokens);
        sentTokens = [];
        tokenCount = 0;

        if(level === levels.par)   { yield authors;             }
        else if(level < levels.par){ extContents.push(authors); }

        continue;
      }


      // Paragraph

      if(line.match(parStartRE)){
        parSents = [];
        sentCount = 0;

        if(level <= levels.par){ curPar = RegExp.$1; }

        continue;
      }

      if(line.match(parEndRE)){
        const par = new Paragraph(curPar, parSents);
        parSents = [];
        sentCount = 0;

        if(level === levels.par)   { yield par;             }
        else if(level < levels.par){ extContents.push(par); }

        continue;
      }


      // Sentence

      if(line.match(sentStartRE)){
        sentCount++;
        sentTokens = [];
        tokenCount = 0;

        continue;
      }

      if(line.match(sentEndRE)){
        const sent = new Sentence(sentCount, sentTokens);
        sentTokens = [];
        tokenCount = 0;

        if(level === levels.sent)    { yield sent;          }
        else if (level < levels.sent){ parSents.push(sent); }

        continue;
      }


      // MWE

      if(line.match(mweStartRE)){
        curMwe = parseMweAttrs(RegExp.$1);
        insideMWE = true;
        mweTokens = [];
        continue;
      }

      if(line.match(mweEndRE)){
        const mwe = new MultiWordExpression(curMwe, mweTokens);
        insideMWE = false;
        mweTokens = [];

        if(level === levels.token)    { yield mwe;            }
        else if (level < levels.token){ sentTokens.push(mwe); }

        continue;
      }


      // Tokens

      const fields = parseLine(line);
      tokenCount++;
      const token = new Token(lineNum, tokenCount, fields);

      if(insideMWE){ mweTokens.push(token); }
      else {
        if(level === levels.token)    { yield token; continue;            }
        else if (level < levels.token){ sentTokens.push(token); continue; }
      }


      // Lines

      if(level === levels.line){ yield line; }

    }
  }
}

module.exports = new CETEMPublico();
