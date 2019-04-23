const fs = require('fs')
const readline = require('readline');
const zlib     = require('zlib');
const fileType = require('file-type');
const readChunk = require('read-chunk');
const request = require('request');
const progress = require('request-progress');
const prettyBytes = require('pretty-bytes');
const path = require('path');
const mkdirp = require('mkdirp');

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

const humanizeSecs = time => {
  if(!time){ return '0s'; }
  time = time.toFixed(0);

  let h, m, s;
  if(Math.floor(time/60) === 0){
    return `${time}s`;
  }

  m = Math.floor(time/60);
  s = time % 60;

  if(Math.floor(m/60) === 0){
    return `${m}m ${s}s`;
  }

  h = Math.floor(m/60);
  m = m % 60;

  return `${h}h ${m}m ${s}s`;
}


class CETEMPublico {
  constructor(file, opts = {}){
    this._file = file || path.join(process.env.HOME, '.cetem-publico', 'CETEMPublicoAnotado2019.gz');
    this._noMWEs    = !!opts.noMWEs;
    this._noTitles  = !!opts.noTitles;
    this._noAuthors = !!opts.noAuthors;
    this._simpMWEs  = !!opts.simpMWEs;

    if(!fs.existsSync(this._file)){
      console.warn('CETEMPublico file not found, use the download() method to download it.');
      return;
    }

    this._initInput();
  }

  _initInput(){
    const buffer = readChunk.sync(this._file, 0, fileType.minimumBytes);
    const ft = fileType(buffer);
    const isGzip = ft && /application\/gzip/.test(ft.mime);

    const gunzip = zlib.createGunzip().on('error', err => {
      console.warn(`Could not read file ${this._file}. Remove it and download it again with the download() method.`);
      console.warn(err);
    });

    const input = isGzip ?
      fs.createReadStream(this._file)
        .pipe(gunzip)
      : fs.createReadStream(this._file);

    this._rl = readline.createInterface({input});
  }

  download(){
    const url = 'https://www.linguateca.pt/CETEMPublico/download/CETEMPublicoAnotado2019.txt';
    const fileFolder = path.join(process.env.HOME, '.cetem-publico');
    const fileName = 'CETEMPublicoAnotado2019.gz';
    const file = path.join(fileFolder, fileName);

    mkdirp.sync(fileFolder);
    if(fs.existsSync(file)){
      console.warn(`File ${file} already exists, refusing to overwrite...`);
      return Promise.resolve();
    }


    return new Promise((resolve, reject) => {
      progress(request(url))
        .on('progress', state => {

          const speed     = state.speed ? prettyBytes(state.speed) + '/s' : '\t\t';
          const percent   = (state.percent * 100).toFixed(2);
          const elapsed   = humanizeSecs(state.time.elapsed);
          const remaining = humanizeSecs(state.time.remaining);
          const transf    = prettyBytes(state.size.transferred);
          const total     = prettyBytes(state.size.total);

          process.stdout.write(`${fileName}\t${speed}\t${percent}%\t${elapsed}/${remaining}\t${transf}/${total}\r`);
        })
        .on('error', err => reject(err))
        .on('end',   ()  => resolve(file))
        .pipe(zlib.createGzip())
        .pipe(fs.createWriteStream(file));
    })
    .then(() => {
      this._file = file;
      this._initInput();
    });
  }

  lines(){
    return this._rl;
  }

  async * _process(iterLevel){
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

        // handle empty MWEs in CETEMPublico bug
        if(curMwe.lema === "" && curMwe.pos === "" && mweTokens.length === 0){
          continue;
        }

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

  extracts(){
    return this._process('ext');
  }

  paragraphs(){
    return this._process('par');
  }

  sentences(){
    return this._process('sent');
  }

  tokens(){
    return this._process('token');
  }

}

module.exports = CETEMPublico;
