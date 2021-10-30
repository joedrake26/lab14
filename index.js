// The People's Dictionary (service) a la https://twodee.org/blog/18222

// let's not have to implement all the higher-level http request/response
// details ourselves https://stackoverflow.com/a/32303730/1449799
const express = require("express");
const service = express();
const WTF = 10; // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseInt#description

// add middleware that express already provides,
// to parse the request body as json
// (for more, search for service.use on:
// https://allover.twodee.org/providing-a-web-service/birdspotter-service/ )
service.use(express.json());

let nextDefId = 8; // I'm doing this so I neither send extra data to the client,
// nor am on the hook to remove it from my data structure each time I want to
// send a response
// note it's strictly greater than the id's I'm hard coding in my dictionary below.

// The resource to share.
const dictionary = {
  duck: {
    word: "duck", // this key is redundant in the implementation I've chosen
    // (i.e. using the word as the key into the object/dictionary).
    // Why'd I choose to add it anyway?
    definitions: [
      {
        // let's intentionally have the definitions out of order so that we have
        // to deal with definitions where their id !== their index in the array
        id: 1,
        likes: 57,
        definition: "funky", // @hcientist's into Vulfpeck
        // see: https://www.youtube.com/c/vulf
      },
      {
        id: 0,
        likes: 4,
        definition: "1612",
      },
    ],
  },
  promise: {
    word: "promise",
    definitions: [
      {
        id: 7, // note that this id is the max of those i've hard coded and is
        // strictly less than the nextDefId I declared above
        likes: 57,
        definition: "what chad couldn't keep",
      },
      {
        id: 4,
        likes: 4,
        definition: "A structure used to represent a pending computation.",
      },
    ],
  },
};

const port = 5000;
service.listen(port, () => {
  console.log(`We're live on port ${port}!`);
});

// why did I write this endpoint before the next one?
service.get("/words", (request, response) => {
  response.json({
    ok: true,
    result: Object.keys(dictionary),
  });
});

service.get("/:word", (request, response, next) => {
  const wordParam = request.params.word;
  if (!(wordParam in dictionary)) {
    response.status(404).json({ ok: false, result: `${wordParam} not found` });
  }
  response.json({
    ok: true,
    result: dictionary[wordParam],
  });
});

service.post("/:word", (request, response, next) => {
  const newWord = request.params.word;
  const newWordDef = request.body.definition;
  // if (newWord in dictionary) {
  // what to do in the case that the word already exists is under-specified.
  // choosing to error and ask client to explicitly delete first if that's the
  // intention
  // a bit unclear what would be the best response status code.
  // I'm thinking something 4xx, see:
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/409
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
  // ***actually, strike that under-specified note, it looks like this is fine, and will just add the
  // definition in the case the word already exists 🤦‍♂️
  // return next(response.status(409).json({
  //   ok: false,
  //   result: {
  //     message: `${wordParam} already in dictionary`,
  //     result: dictionary[wordParam],
  //   }
  // }));
  // }

  // add the new word with its defn to our "database":
  // if the word is totally new, add it to the dictionary with a placeholder for the definitions
  if (!(newWord in dictionary)) {
    dictionary[newWord] = {
      word: newWord,
      definitions: [],
    };
  }
  // whether the word's new or existing, add the definition to its list of definitions
  dictionary[newWord].definitions.push({
    id: nextDefId++,
    likes: 0, // per example, but imho adding a new word represents at least 1 vote for it?
    definition: newWordDef,
  });

  response.json({
    ok: true,
    result: dictionary[newWord],
  });
});

// to test ^^^ :
// curl -v \
// --request POST \
// --header 'Content-Type: application/json' \
// --data '{"definition": "world wide web"}' \
// http://localhost:5000/www

// is it as follows in windows?
// Invoke-WebRequest -Uri http://localhost:5000/www -Method POST -Body '{"definition": "world wide web"}'
// ^^ maybe doesn't work for folks?
// if you're having trouble on Windows, consider either of these:
// 1.  testing with curl via git-bash, which you may already have installed from installing Git.
// 2. create a free account and use either the online or downloadable Postman app https://www.postman.com/

// increments the number of likes of the specified definition and yields the incremented number.
// The JSON payload of the response looks something like this:

// {
//   "ok": true,
//   "result": {
//     "word": "ashcat",
//     "id": 32,
//     "likes": 1,
//   }
// }

// If the word or definition doesn’t exist, then a 404 response is given with ok
// set to false an error message given for result.
service.patch("/:word/:definitionId/like", (request, response, next) => {
  // get you some destructuring https://medium.com/@pyrolistical/destructuring-nested-objects-9dabdd01a3b8
  const { word, definitionId } = request.params;
  if (!(word in dictionary)) {
    return next(
      response
        .status(404)
        .json({ ok: false, result: `word: "${word}" not found` })
    );
  }

  const defnIdx = dictionary[word].definitions.findIndex((defnObj) => {
    return defnObj.id === parseInt(definitionId, WTF);
  });

  if (defnIdx < 0) {
    return next(
      response.status(404).json({
        ok: false,
        result: `definition with id: ${definitionId} not found for word: "${word}"`,
      })
    );
  }

  dictionary[word].definitions[defnIdx].likes++;
  response.json({
    ok: true,
    result: {
      word: dictionary[word].word,
      id: definitionId,
      likes: dictionary[word].definitions[defnIdx].likes,
    },
  });
});

service.patch("/:word/:definitionId", (request, response, next) => {
  // note the following error checking is the same for this and the previous endpoint.
  // how could I refactor it?
  const { word, definitionId } = request.params;
  if (!(word in dictionary)) {
    return next(
      response
        .status(404)
        .json({ ok: false, result: `word: "${word}" not found` })
    );
  }

  const defnIdx = dictionary[word].definitions.findIndex((defnObj) => {
    return defnObj.id === parseInt(definitionId, WTF);
  });

  if (defnIdx < 0) {
    return next(
      response.status(404).json({
        ok: false,
        result: `definition with id: ${definitionId} not found for word: "${word}"`,
      })
    );
  }

  const { definition } = request.body;

  dictionary[word].definitions[defnIdx].definition = definition;
  response.json({
    ok: true,
    result: {
      word: dictionary[word].word,
      id: definitionId,
      likes: dictionary[word].definitions[defnIdx].likes,
      definition: definition,
    },
  });
});

service.delete("/:word/:definitionId", (request, response, next) => {
  // note the following error checking is the same for this and the previous endpoint.
  // how could I refactor it?
  const { word, definitionId } = request.params;
  if (!(word in dictionary)) {
    return next(
      response
        .status(404)
        .json({ ok: false, result: `word: "${word}" not found` })
    );
  }

  const defnIdx = dictionary[word].definitions.findIndex((defnObj) => {
    return defnObj.id === parseInt(definitionId, WTF);
  });

  if (defnIdx < 0) {
    return next(
      response.status(404).json({
        ok: false,
        result: `definition with id: ${definitionId} not found for word: "${word}"`,
      })
    );
  }
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice#remove_1_element_at_index_3
  dictionary[word].definitions.splice(defnIdx, 1);
  response.json({
    ok: true,
    result: {
      word: word,
      id: definitionId,
    },
  });
});

service.delete("/:word", (request, response, next) => {
  // note the following error checking is the same for this and the previous endpoint.
  // how could I refactor it?
  const { word } = request.params;
  if (!(word in dictionary)) {
    return next(
      response
        .status(404)
        .json({ ok: false, result: `word: "${word}" not found` })
    );
  }

  delete dictionary[word];
  response.json({
    ok: true,
    result: {
      word: word,
    },
  });
});

service.get("/search/:substring", (request, response, next) => {
  const { substring } = request.params;

  response.json({
    ok: true,
    result: Object.values(dictionary).filter((wordObj) => {
      return (
        wordObj.word.indexOf(substring) > -1 ||
        wordObj.definitions.some((defnObj) => {
          return defnObj.definition.indexOf(substring) > -1;
        })
      );
    }),
  });
});