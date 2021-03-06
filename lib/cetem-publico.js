const fs = require('fs');
const zlib = require('zlib');
const fileType = require('file-type');
const readChunk = require('read-chunk');
const request = require('request');
const rprogress = require('request-progress');
const path = require('path');
const mkdirp = require('mkdirp');
const sprogress = require('progress-stream');
const prettyBytes = require('pretty-bytes');
const EventEmitter = require('events');
const cliProgress = require('cli-progress');
const Iconv  = require('iconv').Iconv;
const iconv = new Iconv('latin1', 'utf-8');

const {Token,MultiWordExpression,Sentence,Paragraph} = require('text-corpus');
const Title   = require('./title');
const Authors = require('./authors');
const Extract = require('./extract');


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

const ignoreRE = /^\s*<.*/;

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
    word    : fields[0].trim(),
    section : fields[1].trim(),
    week    : fields[2].trim(),
    lemma   : fields[3].trim(),
    pos     : fields[4].trim(),
    other   : fields.slice(5).map(s => s.trim())
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


class CETEMPublico extends EventEmitter {
  constructor(file, opts = {}){
    super();
    this._file = file || path.join(process.env.HOME, '.cetem-publico', 'CETEMPublicoAnotado2019.gz');
    this._noMWEs    = !!opts.noMWEs;
    this._noTitles  = !!opts.noTitles;
    this._noAuthors = !!opts.noAuthors;
    this._simplMWEs  = !!opts.simplMWEs;

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

    var stat = fs.statSync(this._file);
    var str = sprogress({
      length: stat.size,
      time: 1000 /* ms */
    });

    str.on('progress', state => {
      const speed      = state.speed;
      const percent    = state.percentage;
      const elapsed    = state.runtime;
      const remaining  = state.eta;
      const transf     = state.transferred;
      const total      = state.length;

      this.emit('read_progress', {speed, percent, elapsed, remaining, transf, total});
    });
    str.on('end', state => {
      this.emit('read_end', state);
    });

    const input = isGzip ?
      fs.createReadStream(this._file)
        .pipe(str)
        .pipe(gunzip)
      : fs.createReadStream(this._file);

    this._rs = input;
  }

  download({statusBar}){
    const url = 'https://www.linguateca.pt/CETEMPublico/download/CETEMPublicoAnotado2019.txt';
    const fileFolder = path.join(process.env.HOME, '.cetem-publico');
    const fileName = 'CETEMPublicoAnotado2019.gz';
    const file = path.join(fileFolder, fileName);

    mkdirp.sync(fileFolder);
    if(fs.existsSync(file)){
      console.warn(`File ${file} already exists, refusing to overwrite...`);
      return Promise.resolve();
    }

    let bar;
    let multibar;

    if(statusBar){
      multibar = new cliProgress.MultiBar({
          format: ' {bar} | {percentage}% | {eta_formatted} left | {prettyCurrent}/{prettyTotal}',
          autopadding: true,
          hideCursor: true,
          barCompleteChar: '\u2588',
          barIncompleteChar: '\u2591',
          clearOnComplete: false,
          stopOnComplete: true
      });
    }


    return new Promise((resolve, reject) => {
      rprogress(request(url))
        .on('progress', state => {
          const speed     = state.speed;
          const percent   = state.percent;
          const elapsed   = state.time.elapsed;
          const remaining = state.time.remaining;
          const transf    = state.size.transferred;
          const total     = state.size.total;


          if(statusBar){
            if(!bar){
              bar = multibar.create(total, transf, {
                prettyTotal: prettyBytes(total),
                prettyCurrent: prettyBytes(transf)
              });
            } else {
              bar.update(state.transf, {
                prettyTotal: prettyBytes(total),
                prettyCurrent: prettyBytes(transf)
              });
            }
          }

          this.emit('dl_progress', {fileName, speed, percent, elapsed, remaining, transf, total});
        })
        .on('error', err => reject(err))
        .on('end',   state  => {
          this.emit('dl_end', state);
          resolve(file);
         })
        .pipe(iconv)
        .pipe(zlib.createGzip())
        .pipe(fs.createWriteStream(file));
    })
    .then(() => {
      this._file = file;
      this._initInput();
    });
  }

  async * lines(){
    let previous = '';
    for await (const chunk of this._rs){
      previous += chunk;

      while (true) {
        const eolIndex = previous.indexOf('\n');
        if (eolIndex < 0) break;

        // line includes the EOL
        const line = previous.slice(0, eolIndex+1);
        yield line;
        previous = previous.slice(eolIndex+1);
      }
    }
    if (previous.length > 0) {
      yield previous;
    }
  }

  // TODO https://stackoverflow.com/questions/58897384
  // async * lines(){
  //   this._rs.resume();
  //   return this._rl;
  // }

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

      if(line.match(extStartRE)){
        if(level === levels.ext){
          curExt = parseExtAttrs(RegExp.$1);
          extContents = [];
        }
        continue;
      }

      if(line.match(extEndRE)){
        if(level === levels.ext){
          const ext = new Extract(curExt, extContents);
          extContents = [];

          yield ext;
        }
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



        let res = [];
        if(this._simplMWEs){
          for(const t of mwe.tokens){ res.push(t); }
        }
        else if(!this._noMWEs){
          res.push(mwe);
        }

        if(level === levels.token){
          for(const r of res){ yield r; }
        }
        else if (level < levels.token){
          for(const r of res){ sentTokens.push(r); }
        }

        continue;
      }


      // Ignore

      if(line.match(ignoreRE)){ continue; }


      // Tokens

      const fields = parseLine(line);
      tokenCount++;
      const token = new Token(fields.word, {...fields, lineNum, tokenId: tokenCount});

      if(insideMWE){ mweTokens.push(token); }
      else {
        if(level === levels.token)    { yield token; continue;            }
        else if (level < levels.token){ sentTokens.push(token); continue; }
      }


      // Lines

      if(level === levels.line){ yield line; }

    }
  }

  format(f){
    if(f === 'brown'){
      return this._formatBrown();
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
