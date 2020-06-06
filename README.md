
# cetem-publico

A wrapper for CETEMPúblico, an European Portuguese corpus of news extracts from the newspaper Público, with 180 million words tagged automatically using PALAVRAS.

## Installation

```bash
$ npm install cetem-publico
```

This will download this module, but it won't download the corpus file,
and it will fail if you try to use it. Use the
[cp.download](#cpdownload) method to download the corpus file
(12GB).

## Usage

___

**This is still a work in progress, API is subject to change without
warning.**

Do you have suggestions? Send me a message or a pull request on
GitHub!
___


```js
const {CETEMPublico} = require('cetem-publico');
const cp = new CETEMPublico();

// cp.download(); // to download the corpus file

async function procLines(){
  for await (const line of cp.lines()){
    // do something with line
  }
}

async function procTokens(){
  for await (const token of cp.tokens()){
    // do something with token
  }
}

async function procSentences(){
  for await (const sent of cp.sentences()){
    // do something with sent
  }
}

async function procParagraphs(){
  for await (const par of cp.paragraphs()){
    // do something with par
  }
}

async function procExtracts(){
  for await (const ext of cp.extracts()){
    // do something with ext
  }
}

```

## Methods

### new CETEMPublico(file)
### new CETEMPublico(opts)
### new CETEMPublico(file, opts)

* `file`: a string containing the path to a local CETEMPublico file. If not provided, the file will be loaded from `$HOME/.cetem-publico/CETEMPublicoAnotado2019.gz`.
* `opts`: see [Options](#options-todo).

### cp.download()

Download a copy of the CETEMPublico corpus from
https://www.linguateca.pt/CETEMPublico/download/, compresses it using
Gzip and stores it in
`$HOME/.cetem-publico/CETEMPublicoAnotado2019.gz`. If file already
exists, it print a warning message and does nothing.

The whole file is 12GB, so this takes some time.

You can monitor the download progress by listening to the
`dl_progress` event. Example:

```
cp.on('dl_progress', state => {
  ({
    fileName,
    speed,
    percent,
    elapsed,
    remaining,
    transf,
    total
  } = state);

  process.stdout.write(`${fileName}\t${speed}\t${percent}%\t${elapsed}/${remaining}\t${transf}/${total}\r`);
});

Returns a `Promise`.
```

### cp.lines(opts)

Returns an `AsyncGenerator` object where each item is a string
containing a line of the original corpus file.

You can monitor the progress of the corpus reading process by listening to the
`read_progress` event. This is valid for any of the corpus reading
functions (`cp.lines`, `cp.tokens`, `cp.sentences`, `cp.paragraphs` and `cp.extracts`). Example:

```
cp.on('read_progress', state => {
  ({
    speed,
    percent,
    elapsed,
    remaining,
    transf,
    total
  } = state);

  process.stdout.write(`Progress: ${speed}\t${percent}%\t${elapsed}/${remaining}\t${transf}/${total}\r`);
});
```

### cp.tokens(opts)

Returns an `AsyncGenerator` object where each item is a Token object
containing one token from the original corpus file.

### cp.sentences(opts)

Returns an `AsyncGenerator` object where each item is a Sentence
object containing a sentence (`<s>` tag) of the original corpus file.

### cp.paragraphs(opts)

Returns an `AsyncGenerator` object where each item is a Paragraph
object containing a paragraph (`<p> tag)` of the original corpus file.

### cp.extracts(opts)

Returns an `AsyncGenerator` object where each item is an Extract
object containing an extract (`<ext>` tag) of the original corpus file.


## Events

### dl_progress

Event emitted while downloading the corpus file.

```
cp.on('dl_progress', state => {})
```

`state` is an object containing the following fields:

* `fileName`: name of the file being downloaded (default:
  `CETEMPublicoAnotado2019.gz`)
* `speed`: download speed (in bytes per second)
* `percent`: percentage of the file already downloaded
* `elapsed`: time passed (in seconds)
* `remaining`: time left (in seconds)
* `transf`: total transferred bytes
* `total`: total size of the file (in bytes)

### dl_end

Event emitted when download ends.

### read_progress

Event emitted while processing the corpus file.

```
cp.on('read_progress', state => {})
```

`state` is an object containing the following fields:

* `speed`: read speed (in bytes per second)
* `percent`: percentage of the file already read
* `elapsed`: time passed (in seconds)
* `remaining`: time left (in seconds)
* `transf`: total read bytes
* `total`: total size of the file (in bytes)

### read_end

Event emitted when reading ends.

## Options (TODO)

* `noMWEs`: Omit multi-word expressions
* `simplMWEs`: Simplify MWEs: return their tokens as any other token
* `noTitles`: Omit titles
* `noAuthors`: Omit authors
* `noTitles`: Omit titles

## Classes

### Token
Used to represent the tokens in the original corpus file. In the
format used by CETEMPublico, each token is in an individual line.

#### `new Token(word, info)`

* `word` is the word in the original corpus text
* `info` (all these are optional)
    * `lineNum`: the line number for this token in the original corpus
      file
    * `tokenId`: an ID for this token
    * `section`: the ID of the section the token is in
    * `week`:
    * `lemma`: the lemmatized version of `word`
    * `pos`: the part-of-speech (POS) tag for `word`
    * `other*: an object with all the extra information found in
      CETEMPublico for this token

### MultiWordExpression

CETEMPublico annotates some mult-word expressions using `<mwe>` tags.
Inside each tag, the tokens which compose the expression, one in each
line. MWEs can have attributes indicating the lemma and the POS tag
for the whole expression.

#### `new MultiWordExpression({lemma, pos}, tokens)`

* `lemma`: the lemma for the multi-word expression
* `pos`: the POS tag for the multi-word expression
* `tokens`: an array of Token objects which make this MWE

### Sentence

In CETEMPublico, a sentence is represented using a `<s>` tag.
Sentences contain a list of tokens (the words in that sentence).
Because some words can form multi-word expressions, inside a
`Sentence` we can find both `Token`s and `MultiWordExpression`s
(which, in turn, have `Token` objects inside).

#### `new Sentence(id, tokens)`

* `id`: an id for the sentence
* `tokens`: an array of tokens and MWEs which form this sentence

### Paragraph
A paragraph, represented in CETEMPublico using the tag `<p>`.
Paragraphs are composed of a sequence of sentences.

#### `new Paragraph(id, sentences)`

* `id`: an id for the sentence
* `sentences`: an array of sentences which form this paragraph

### Extract

An extract of an news article. Extracts are represented by the tag
`<ext>` and contain a sequence of sentences. Optionally, they can also
include a Title and Authors, and the attributes `n` (an id for the
extract), `sec` (the newspaper section it was gathered from) and `sem`
(the week in which it was published).

#### `new Extract({n, sec, sem}, contents)`

* `n`: the number of this extract
* `section`: the section in which the extract was found
* `week`: the week it was published on
* `contents`: an array of Paragraph objects, possibly also including a
  Title and an Authors objects

### Authors

The authors of the article an Extract was gathered from.

#### `new Authors(tokens)`

* `tokens`: an array of `Token` objects, each being an author of the
  article

### Title

The title of the article the Extract belongs to.

#### `new Title(tokens)`

* `tokens`: an array of `Token` objects which make the title


## TODO

* Implement `opts`
* Fix ID in '«' and '»' (these quotation marks don't seem to get
  attributed IDs in the original CETEMPublico)
* Add tests
* Speed up download using `fast-request`?
* Add options to `cp.download`
    * Where to download from
    * Where to download to
* ...

## Acknowledgements

This module only exists thanks to the [Publico](https://www.publico.pt) newspaper and the team responsible for the [CETEMPublico](https://www.linguateca.pt/CETEMPublico/) corpus.

## Bugs and stuff
Open a [GitHub issue](https://github.com/andrefs/node-cetem-publico/issues) or, preferably, send me a pull request.

## License

MIT

