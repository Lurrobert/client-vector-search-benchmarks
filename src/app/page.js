"use client"

import { useState, useEffect, useRef, useCallback } from 'react'

export default function Home() {

  const [result, setResult] = useState(null);
  const [ready, setReady] = useState(null);
  const [inputValue, setInputValue] = useState(250);
  const [inProgress, setInProgress] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [searchValue, setSearchValue] = useState('');
  const [rawText, setRawText] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [size, setSize] = useState(null);

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  const worker = useRef(null);
  useEffect(() => {
    if (!worker.current) {
      worker.current = new Worker(new URL('./worker.js', import.meta.url), {
        type: 'module'
      });
    }

    const onMessageReceived = (e) => {
      switch (e.data.type) {
        case 'classify':
          switch (e.data.status) {
            case 'initiate':
              setReady(false);
              break;
            case 'complete':
              setReady(true);
              setResult(e.data.output)
              setInProgress(false);
              setCurrentProgress(0)
              break;
            case 'update':
              setReady(false);
              setCurrentProgress(e.data.progress)
              break;
            case 'error':
              setReady(true);
              setResult(e.data.error)
              setInProgress(false);
              break;
          }
          break;
        case 'search':
          switch (e.data.status) {
            case 'initiate':
              setReady(false);
              break;
            case 'complete':
              setReady(true);
              setSearchResult(e.data.output)
              setInProgress(false);
              break;
            case 'update':
              setReady(false);
              setCurrentProgress(e.data.progress)
              break;
            case 'error':
              setReady(true);
              setResult(e.data.error)
              setInProgress(false);
              break;
            case 'size':
              setReady(true);
              setSize(e.data.output)
              setInProgress(false);
              break;
          }
          break;
      }
    };

    worker.current.addEventListener('message', onMessageReceived);
    return () => worker.current.removeEventListener('message', onMessageReceived);
  });

  const classify = useCallback((text) => {
    if (worker.current) {
      worker.current.postMessage({ type: 'classify', text });
    }
  }, []);

  const searchEmbeddings = useCallback((text) => {
    if (worker.current) {
      worker.current.postMessage({ type: 'search', text });
    }
  }, []);

  const addRawText = useCallback((text) => {
    if (worker.current) {
      worker.current.postMessage({ type: 'addRawText', text });
    }
  }, []);
  

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-12">
      <h1 className="text-5xl font-bold mb-2 text-center">Transformers.js</h1>
      <h2 className="text-2xl mb-4 text-center">Next.js template (client-side)</h2>
      <input
        type="range"
        className="w-full max-w-xs p-2 border border-gray-300 rounded mb-4"
        placeholder="Enter number of vectors to generate"
        min="100"
        max="5000"
        step="250"
        defaultValue="250"
        onChange={handleInputChange}
      />
      {/* manual input */}
      <input
        type="number"
        className="w-full max-w-xs p-2 border border-gray-300 rounded mb-4"
        placeholder="Enter number of vectors to generate"
        min="100"
        max="60000"
        defaultValue="250"
        onChange={handleInputChange}
      />

      <p className="text-center mb-4">Number of vectors to generate: <span className="font-bold">{inputValue}</span></p>
      <button
        className="w-full max-w-xs p-2 border border-gray-300 rounded mb-4"
        onClick={e => {
          setInProgress(true);
          classify(parseInt(inputValue))
        }}
      >
        Submit
      </button>

      <p className="text-center mb-4">Paste raw text to add to the database</p>
      
      <textarea
        className="w-full max-w-xs p-2 border border-gray-300 rounded mb-4"
        rows="10"
        placeholder="Paste your text here..."
        onChange={e => {
          setRawText(e.target.value)
        }}
      />
      
      <button
        className="w-full max-w-xs p-2 border border-gray-300 rounded mb-4"
        onClick={e => {
          setInProgress(true);
          addRawText(rawText)
        }}
      >
        Submit
      </button>
      



      {/* panels */}
      <div className="flex min-h-screen">
        {/* Left Panel */}
        <div className="w-1/2 flex flex-col items-center justify-center p-12">
          <h1 className="text-5xl font-bold mb-2 text-center">Client side compute</h1>
          {ready !== null && (
            <div>
              {
                inProgress ? (
                  <>
                    <p>Loading...</p>
                    <div className="relative pt-3">
                      <div className="overflow-hidden h-4 mb-4 text-sm flex rounded bg-blue-200">
                      <div style={{ width: `${(currentProgress/inputValue)*100}%`, height: '70px' }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"></div>
                      <div>{currentProgress} / {inputValue} </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <h1 className="text-5xl font-bold mb-2 text-center">
                    <pre>{result} seconds</pre>
                    <pre>for {inputValue} vectors</pre>
                  </h1>
                  
                )
              }
            </div>
          )}
        </div>
        <div className="w-1/2 flex flex-col items-center justify-center p-12">
          <h1 className="text-5xl font-bold mb-2 text-center">Embedding Search</h1>
          <div className="w-full max-w-xs p-2 border border-gray-300 rounded mb-4">
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="Search embeddings..."
              onChange= {e => {
                setSearchValue(e.target.value)
              }}

            />
          </div>
          <button
            className="w-full max-w-xs p-2 border border-gray-300 rounded"
            onClick={e => {
              setInProgress(true);
              searchEmbeddings(searchValue)
            }}
          >
            Search
          </button>
          {ready !== null && (
            <div>
              {
                inProgress ? (
                  <>
                    <p>Loading...</p>
                  </>
                ) : (
                  <>
                    {searchResult && searchResult.map((item, index) => (
                      <div key={index}>
                        <div className="w-full max-w-xs p-2">
                          <pre>{`Similarity: ${item.similarity}`}</pre>
                          <pre>{`Match: ${JSON.stringify(item.object.name)}`}</pre>
                        </div>
                      </div>
                    ))}
                  </>
                )
              }
              TOTAL SIZE: {size}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}