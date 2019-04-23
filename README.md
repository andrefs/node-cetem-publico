
# cetem-publico

European Portuguese corpus of news from the newspaper Público, with 180 million words tagged with PALAVRAS.

## Installation

From [Npm][npmjs]:

```bash
$ npm install cetem-publico
```

This will download this module, but it won't download the corpus file,
and it will fail if you try to use it.

## Usage

```js
const CETEMPublico = require('cetem-publico').CETEMPublico;
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
* `opts`: see [Options](#Options).

### cp.download()

Download a copy of the CETEMPublico corpus from
https://www.linguateca.pt/CETEMPublico/download/, compresses it using
Gzip and stores it in
`$HOME/.cetem-publico/CETEMPublicoAnotado2019.gz`. If file already
exists, it print a warning message and does nothing.

The whole file is 12GB, so this takes some time.

Returns a `Promise`.

### cp.lines(opts)

Returns an `AsyncGenerator` object where each item is a string
containing a line of the original corpus file.

### cp.tokens(opts)

Returns an `AsyncGenerator` object where each item is a Token object
containing one token from the original corpus file.

### cp.sentences(opts)

Returns an `AsyncGenerator` object where each item is a Sentence
object containing a `<sentence>` of the original corpus file.

### cp.paragraphs(opts)

Returns an `AsyncGenerator` object where each item is a Paragraph
object containing a `<paragraph>` of the original corpus file.

### cp.extracts(opts)

Returns an `AsyncGenerator` object where each item is an Extract
object containing an `<extract>` of the original corpus file.

## Options (TODO)

* `noMWEs`: Ignore multi-word expressions: return their tokens as any
  other token.
* `noTitles`: Omit titles
* `noAuthors`: Omit authors
* `noTitles`: Omit titles

## Classes

### Token

### MultiWordExpression

### Sentence

### Paragraph

### Title

### Authors

### Extract

## TODO

* Implement `opts`
* Speed up download using `fast-request`?
* ...

## Contribution

* Source Code is hosted on [Github][repo]
* Pull requests be accompanied with tests as in the `/tests` directory
* Issues may be filed [here][issues]

## License

Copyright (c) 2014 Forfuture LLC

Sequential Ids and its source code are licensed under the [MIT][mit] license. See [LICENSE](LICENSE) file accompanying this text.


[issues]:https://github.com/forfuture-dev/node-sequential-ids/issues
[mit]:https://opensource.org/licenses/MIT
[nodejs]:https://nodejs.org
[npmjs]:https://npmjs.org/sequential-ids
[repo]:https://github.com/forfuture-dev/node-sequential-ids
