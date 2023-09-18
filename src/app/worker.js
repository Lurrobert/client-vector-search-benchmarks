import { getEmbedding, EmbeddingIndex } from 'client-vector-search'
import axios from 'axios';
import retry from 'async/retry';



export async function getServerSideProps() {
    let vocabulary = [];

    try {
        console.log('Downloading the file...');
        const response = await axios.get('https://raw.githubusercontent.com/gokhanyavas/Oxford-3000-Word-List/master/Oxford%203000%20Word%20List.txt');
        const data = response.data;

        vocabulary = data.split('\n');
    } catch (error) {
        console.error('Error downloading the file:', error);
    }

    return vocabulary
}

function splitTextWithOverlap(text) {
    // Split the text into an array of words
    // strip any nymber of repeated space characters or new line with a single space
    text = text.replace(/\s+/g, ' ')
    const words = text.split(' ');

    // Initialize variables for sentence length and overlapping
    const sentenceLengthToSplit = 15;
    const overlapping = 4;

    // Initialize an empty array to store the resulting sentences
    let result = [];

    // Iterate over the array of words to create sentences
    for (let i = 0; i < words.length; i += sentenceLengthToSplit - overlapping) {
        // Extract a slice of words to form a sentence
        let slice = words.slice(i, i + sentenceLengthToSplit);

        // Join the slice into a sentence and add it to the result array
        result.push(slice.join(' '));
    }

    return result;
}

const vocabulary = await getServerSideProps();

const index = new EmbeddingIndex();
let completed = 0;
let promises = [];
let executionTimes = [];


const apiMethod = function(options, callback) {
    axios.request(options)
        .then(response => {
            console.log("status", response.status)
            let {embeddings, timeTaken } = response.data
            executionTimes.push(timeTaken)
            callback(null, embeddings[0]);

        })
        .catch(error => {
            console.error(`Error making the request: ${error}`);
            callback(error, null);
        });
}

async function makeRequestAndCheckStatus(randomWords, i, index) {
    const options = {
        method: 'POST',
        url: 'https://rudyzfwgfyqdrkgdisnh.functions.supabase.co/gte-inference',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZHl6ZndnZnlxZHJrZ2Rpc25oIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTQyNTk4NTEsImV4cCI6MjAwOTgzNTg1MX0.Pt2lSJrXSv8lhgGfFVi1csgmdZoPcP5_4Yu2oky1BAs',
        },
        data: {
            "input": [randomWords]
        }
    };
    return new Promise((resolve, reject) => {
        retry({
            times: 5,
            interval: function(retryCount) {
              return 50 * retryCount;
            }
          }, 
          function (callback) { return apiMethod(options, callback) },
          function(err, result) {   
            if(err) {
                console.error("Error: ", err);
                reject(err);
            } else {
                const objectToAdd = { id: i, name: randomWords, embedding: result };
                index.add(objectToAdd);
                completed++;
                self.postMessage({
                    type: 'classify',
                    status: 'update',
                    progress: completed,
                    cloud: true
                });
                resolve(result);
            }
          });
    });
}


async function handlePromises() {
    while (true) {
        let pendingPromises = promises.filter(p => p.status === 'pending');
        if (pendingPromises.length === 0) {
            break; // Exit if all promises are settled
        }

        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second before checking again
    }
}

async function generateEmbeddings(numVectors, numWords = 5) {
    const vocabLength = vocabulary.length;

    // Local computing
    let startTime, endTime;
    self.postMessage({
        type: 'classify',
        status: 'initiate',
        cloud: false
    });
    startTime = new Date();
    for (let i = 0; i < numVectors; i++) {
        var randomWords = ''
        for (let j = 0; j < numWords; j++) {
            const randomIndex = Math.floor(Math.random() * (vocabLength - 1));
            randomWords += vocabulary[randomIndex] + ' ';
        }
        const objectToAdd = { id: i, name: randomWords, embedding: await getEmbedding(randomWords) };
        index.add(objectToAdd);
        if ((i + 1) % 10 === 0) {
            self.postMessage({
                type: 'classify',
                status: 'update',
                progress: i + 1,
                cloud: false
            });
        }
    }
    
    endTime = new Date();
    let timeDiff = (endTime - startTime) / 1000;
    timeDiff = timeDiff.toFixed(2);
    console.log(
        'Local time', timeDiff
    )
    self.postMessage({
        type: 'classify',
        status: 'complete',
        output: timeDiff,
        cloud: false
    });

    await index.saveIndex("indexedDB", "dbName", "ObjectStoreName");


    // Cloud computing
    self.postMessage({
        type: 'classify',
        status: 'initiate',
        cloud: true
    });
    startTime = new Date();

    promises = [];
    completed = 0;
    executionTimes = [];


    for (let i = 0; i < numVectors; i++) {
        var randomWords = ''
        for (let j = 0; j < numWords; j++) {
            const randomIndex = Math.floor(Math.random() * (vocabLength - 1));
            randomWords += vocabulary[randomIndex] + ' ';
        }
            let promise = makeRequestAndCheckStatus(randomWords, i, index);
            promises.push({
                promise,
                status: 'pending'
            });
            promise.then(() => {
                promises.find(p => p.promise === promise).status = 'fulfilled';
            }).catch(() => {
                promises.find(p => p.promise === promise).status = 'rejected';
            });
        }

    await handlePromises().then(() => {
        console.log("All promises have been checked.");
    });
    
    endTime = new Date();
    timeDiff = (endTime - startTime) / 1000;
    timeDiff = timeDiff.toFixed(2);
    console.log(
        'Cloud time', timeDiff
    )
    console.log(
        "Average time", executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length
    )
    console.log(
        "Max time", Math.max(...executionTimes)
    )
    console.log(
        "Min time", Math.min(...executionTimes)
    )

    self.postMessage({
        type: 'classify',
        status: 'complete',
        output: timeDiff,
        cloud: true
    });
}

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
    const { type, text } = event.data;

    switch (type) {
        case 'classify':
            try {
                await generateEmbeddings(text);
            } catch (error) {
                console.error(error);
                self.postMessage({
                    type: 'classify',
                    status: 'error',
                    error: error.message,
                    cloud: true
                });
                self.postMessage({
                    type: 'classify',
                    status: 'error',
                    error: error.message,
                    cloud: false
                });
            }
            break;
        case 'search':
            try {
                self.postMessage({
                    status: 'initiate',
                    cloud: false
                });
                // measure time
                let startTime, endTime;
                startTime = new Date();
                const results = await index.search(
                    await getEmbedding(text),
                     {
                        topK: 5,
                        useStorage: 'indexedDB',
                        storageOptions: {
                            indexedDBName: 'clientVectorDB',
                            indexedDBObjectStoreName: 'ClientEmbeddingStore',
                        },
                    },
                )
                endTime = new Date();
                let timeDiff = endTime - startTime;
                self.postMessage({
                    type: 'search',
                    status: 'complete',
                    output: {result: results, time: timeDiff},
                    cloud: false,
                });

                const DBsize = await index.getAllObjectsFromIndexedDB('dbName', 'ObjectStoreName')
                self.postMessage({
                    type: 'search',
                    status: 'size',
                    output: DBsize.length,
                    cloud: false
                });
            }
            catch (error) {
                console.error(error);
                self.postMessage({
                    type: 'search',
                    status: 'error',
                    error: error.message,
                    cloud: false
                });
            }
            break;
        case 'addRawText':
            try {
                const sentences = splitTextWithOverlap(text);
                self.postMessage({
                    type: 'addRawText',
                    status: 'size',
                    output: sentences.length,
                    cloud: false
                });
                let startTime, endTime;
                self.postMessage({
                    type: 'classify',
                    status: 'initiate',
                    cloud: false
                });

                startTime = new Date();
                for (let i = 0; i < sentences.length; i++) {
                    if (sentences[i] === '') {
                        continue;
                    }
                    const objectToAdd = { id: i, name: sentences[i], embedding: await getEmbedding(sentences[i]) };
                    index.add(objectToAdd);

                    if ((i + 1) % 50 === 0) {
                        self.postMessage({
                            type: 'classify',
                            status: 'update',
                            progress: i + 1,
                            cloud: false
                        });
                    }
                }
                await index.saveIndex("indexedDB", "dbName", "ObjectStoreName")

                endTime = new Date();
                let timeDiff = (endTime - startTime) / 1000;
                timeDiff = timeDiff.toFixed(2);
                console.log(
                    'TT TIME', timeDiff
                )
                self.postMessage({
                    type: 'classify',
                    status: 'complete',
                    output: timeDiff,
                    cloud: false
                });
                return timeDiff
            } catch (error) {
                console.error(error);
                self.postMessage({
                    type: 'classify',
                    status: 'error',
                    error: error.message,
                });
            }
            break;
        case 'delete':
            try {
                await index.deleteIndexedDBObjectStore("dbName", text)
                self.postMessage({
                    type: 'delete',
                    status: 'complete',
                });
            } catch (error) {
                console.error(error);
                self.postMessage({
                    type: 'delete',
                    status: 'error',
                    error: error.message,
                });
            }
    }
});
