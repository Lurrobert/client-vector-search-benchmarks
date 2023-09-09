import { getEmbedding, EmbeddingIndex } from '@robertoooooo/client-vector-search'
import axios from 'axios';


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
    console.log('text', text)
    const words = text.split(' ');
  
    // Initialize variables for sentence length and overlapping
    const sentenceLengthToSplit = 7;
    const overlapping = 2;
  
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

const vocabulary =  await getServerSideProps();

const index = new EmbeddingIndex();

async function generateEmbeddings(numVectors, numWords = 5) {
    const vocabLength = vocabulary.length;
    let startTime, endTime;
    self.postMessage({
        type: 'classify',
        status: 'initiate',
    });

    startTime = new Date();
    for (let i = 0; i < numVectors; i++) {
        var randomWords = ''
        for (let j = 0; j < numWords; j++) {
            const randomIndex = Math.floor(Math.random() * (vocabLength-1));
            randomWords += vocabulary[randomIndex] + ' ';
        }

        const objectToAdd = { id: i, name: randomWords, embedding: await getEmbedding(randomWords) };
        index.add(objectToAdd);

        if ((i + 1) % 50 === 0) {
            console.log('50v done...');
            self.postMessage({
                type: 'classify',
                status: 'update',
                progress: i + 1,
            });
        }
    }
    await index.saveIndexToDB("dbName", "ObjectStoreName");

    endTime = new Date();
    let timeDiff = (endTime - startTime) / 1000;
    timeDiff = timeDiff.toFixed(2);
    console.log(
        'TT TIME', timeDiff
    )
    return timeDiff
}

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
    const { type, text } = event.data;

    switch (type) {
        case 'classify':
            try {
                // number of embeddings to generate
                const generationTimes = await generateEmbeddings(text)
                self.postMessage({
                    type: 'classify',
                    status: 'complete',
                    output: generationTimes,
                });
            } catch (error) {
                console.error(error);
                self.postMessage({
                    type: 'classify',
                    status: 'error',
                    error: error.message,
                });
            }
            break;
        case 'search':
            try {
                self.postMessage({
                    status: 'initiate',
                });            
                const results = await index.search(
                    await getEmbedding(text),
                    { topK: 5 },
                    true,
                    'dbName',
                    'ObjectStoreName'
                )
                console.log('results', results)
                self.postMessage({
                    type: 'search',
                    status: 'complete',
                    output: results,
                });

                const DBsize = await index.getAllObjectsFromDB('dbName', 'ObjectStoreName')
                console.log('DBsize', DBsize.length)
                self.postMessage({
                    type: 'search',
                    status: 'size',
                    output: DBsize.length,
                });
            }
            catch (error) {
                console.error(error);
                self.postMessage({
                    type: 'search',
                    status: 'error',
                    error: error.message,
                });
            }
            break;
        case 'addRawText':
            try {
                console.log('text', text)
                const sentences = splitTextWithOverlap(text);
                self.postMessage({
                    type: 'search',
                    status: 'size',
                    output: sentences.length,
                });
                console.log('sentences', sentences)
                let startTime, endTime;
                self.postMessage({
                    type: 'classify',
                    status: 'initiate',
                });

                startTime = new Date();
                for (let i = 0; i < sentences.length; i++) {
                    const objectToAdd = { id: i, name: sentences[i], embedding: await getEmbedding(sentences[i]) };
                    index.add(objectToAdd);

                    if ((i + 1) % 50 === 0) {
                        console.log('50+ done...');
                        self.postMessage({
                            type: 'classify',
                            status: 'update',
                            progress: i + 1,
                        });
                    }
                }
                await index.saveIndexToDB("dbName", "ObjectStoreName");

                endTime = new Date();
                let timeDiff = (endTime - startTime) / 1000;
                timeDiff = timeDiff.toFixed(2);
                console.log(
                    'TT TIME', timeDiff
                )
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
                await index.deleteObjectStore("dbName", text)
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
