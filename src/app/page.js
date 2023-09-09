"use client"
import React from "react";
import { useState, useEffect, useRef, useCallback } from 'react'

import {CircularProgress, Card, CardBody, CardFooter, Chip} from "@nextui-org/react";
import { Button } from "@nextui-org/react";



export default function Home() {
  // global
  const [inputValue, setInputValue] = useState(250);
  const [searchValue, setSearchValue] = useState('');
  const [rawText, setRawText] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [size, setSize] = useState(null);

  // local
  const [resultLocal, setResultLocal] = useState(null);
  const [readyLocal, setReadyLocal] = useState(null);
  const [inProgressLocal, setInProgressLocal] = useState(false);
  const [currentProgressLocal, setCurrentProgressLocal] = useState(0);

  // cloud
  const [resultCloud, setResultCloud] = useState(null);
  const [readyCloud, setReadyCloud] = useState(null);
  const [inProgressCloud, setInProgressCloud] = useState(false);
  const [currentProgressCloud, setCurrentProgressCloud] = useState(0);

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
      switch (e.data.cloud) {
        case false:{
          switch (e.data.type) {
            case 'classify':
              switch (e.data.status) {
                case 'initiate':
                  setReadyLocal(false);
                  break;
                case 'complete':
                  setReadyLocal(true);
                  setResultLocal(e.data.output)
                  setInProgressLocal(false);
                  setCurrentProgressLocal(0)
                  break;
                case 'update':
                  setReadyLocal(false);
                  setCurrentProgressLocal(e.data.progress)
                  break;
                case 'error':
                  setReadyLocal(true);
                  setResultLocal(e.data.error)
                  setInProgressLocal(false);
                  break;
              }
              break;
            case 'search':
              switch (e.data.status) {
                case 'initiate':
                  setReadyLocal(false);
                  break;
                case 'complete':
                  setReadyLocal(true);
                  setSearchResult(e.data.output)
                  setInProgressLocal(false);
                  break;
                case 'update':
                  setReadyLocal(false);
                  setCurrentProgressLocal(e.data.progress)
                  break;
                case 'error':
                  setReadyLocal(true);
                  setResultLocal(e.data.error)
                  setInProgressLocal(false);
                  break;
                case 'size':
                  setReadyLocal(true);
                  setSize(e.data.output)
                  setInProgressLocal(false);
                  break;
              }
              break;
            case 'addRawText':
              switch (e.data.status) {
                case 'size':
                  setReadyLocal(true);
                  setCurrentProgressLocal(0)
                  setInputValue(e.data.output)
                  break;
              }
              break;
            }
          }
          break;
        case true: {
          switch (e.data.type) {
            case 'classify':
              switch (e.data.status) {
                case 'initiate':
                  setReadyCloud(false);
                  break;
                case 'complete':
                  setReadyCloud(true);
                  setResultCloud(e.data.output)
                  setInProgressCloud(false);
                  setCurrentProgressCloud(0)
                  break;
                case 'update':
                  setReadyCloud(false);
                  setCurrentProgressCloud(e.data.progress)
                  break;
                case 'error':
                  setReadyCloud(true);
                  setResultCloud(e.data.error)
                  setInProgressCloud(false);
                  break;
              }
              break;
            }
          }
          break;
      }
    };

    worker.current.addEventListener('message', onMessageReceived);
    return () => worker.current.removeEventListener('message', onMessageReceived);
  });

  const classify = useCallback((text) => {
    if (worker.current) {
      worker.current.postMessage({ type: 'classify', text: text });
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

  const deleteObjectStore = useCallback((text) => {
    if (worker.current) {
      worker.current.postMessage({ type: 'delete', text });
    }
  }, []);
  

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-12">
      
      <h1 className="text-5xl font-bold mb-2 text-center">Semantic search indexing</h1>
      <h2 className="text-2xl mb-4 text-center">On client side (no backend) VS cloud</h2>
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
      <input
        type="number"
        className="w-full max-w-xs p-2 border border-gray-300 rounded mb-4"
        placeholder="Enter number of vectors to generate"
        min="100"
        max="60000"
        defaultValue="250"
        onChange={handleInputChange}
      />

      <div className="text-center mb-4">Number of vectors to generate: <span className="font-bold">{inputValue}</span></div>
      <Button
        color="primary"
        className="w-full max-w-xs p-2 border border-gray-300 rounded mb-4"
        onClick={e => {
          setInProgressLocal(true);
          setInProgressCloud(true);
          classify(parseInt(inputValue))
        }}
      >
        Generate random embeddings
      </Button>

      {/* <div className="text-center mb-4">Paste raw text to add to the database</div>
      
      <textarea
        className="w-full max-w-xs p-2 border border-gray-300 rounded mb-4"
        rows="10"
        placeholder="Paste your text here..."
        onChange={e => {
          setRawText(e.target.value)
        }}
      /> */}
{/*       
      <Button
        color="primary"
        className="w-full max-w-xs p-2 border border-gray-300 rounded mb-4"
        onClick={e => {
          setInProgress(true);
          addRawText(rawText)
        }}
      >
        Generate embeddings from raw text
      </Button> */}



      {/* panels */}
      <div className="flex">
        {/* Left Panel */}
        <div className="w-1/2 flex flex-col items-center justify-center p-12">
          <h1 className="text-5xl font-bold mb-2 text-center">Client side compute</h1>
          {readyLocal !== null && (
            <div>
              {
                inProgressLocal ? (
                  <>
                    <Card className="w-[240px] h-[240px] border-none">
                      <CardBody className="justify-center items-center pb-0">
                        <CircularProgress
                          classNames={{
                            svg: "w-36 h-36 drop-shadow-md",
                            indicator: "stroke-black",
                            track: "stroke-black/10",
                            value: "text-3xl font-semibold text-black",
                          }}
                          value={(currentProgressLocal/inputValue)*100}
                          strokeWidth={4}
                          showValueLabel={true}
                        />
                      </CardBody>
                      <CardFooter className="justify-center items-center pt-0">
                        <Chip
                          classNames={{
                            base: "border-1 border-black/30",
                            content: "text-black/90 text-small font-semibold",
                          }}
                          variant="bordered"
                        >
                          {currentProgressLocal} / {inputValue} Data points
                        </Chip>
                      </CardFooter>
                    </Card>
                  </>
                ) : (
                  <h1 className="text-5xl font-bold mb-2 text-center">
                    <pre>{resultLocal} seconds</pre>
                    <pre>for {inputValue} vectors</pre>
                  </h1>
                  
                )
              }
            </div>
          )}
        </div>

        {/* Right Panel */}

        <div className="w-1/2 flex flex-col items-center justify-center p-12">
          <h1 className="text-5xl font-bold mb-2 text-center">Cloud computing of GTE small on edge</h1>
          {readyCloud !== null && (
            <div>
              {
                inProgressCloud ? (
                  <>
                    <Card className="w-[240px] h-[240px] border-none">
                      <CardBody className="justify-center items-center pb-0">
                        <CircularProgress
                          classNames={{
                            svg: "w-36 h-36 drop-shadow-md",
                            indicator: "stroke-black",
                            track: "stroke-black/10",
                            value: "text-3xl font-semibold text-black",
                          }}
                          value={(currentProgressCloud/inputValue)*100}
                          strokeWidth={4}
                          showValueLabel={true}
                        />
                      </CardBody>
                      <CardFooter className="justify-center items-center pt-0">
                        <Chip
                          classNames={{
                            base: "border-1 border-black/30",
                            content: "text-black/90 text-small font-semibold",
                          }}
                          variant="bordered"
                        >
                          {currentProgressCloud} / {inputValue} Data points
                        </Chip>
                      </CardFooter>
                    </Card>
                  </>
                ) : (
                  <h1 className="text-5xl font-bold mb-2 text-center">
                    <pre>{resultCloud} seconds</pre>
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
          <Button 
            color="primary"
            className="w-full max-w-xs p-2 border border-gray-300 rounded"
            onClick={e => {
              setInProgressLocal(true);
              searchEmbeddings(searchValue)
            }}
          >
            Search
          </Button>
          {readyLocal !== null && (
            <div>
              {(
                  <>
                  <div className="gap-1 grid grid-cols-2 sm:grid-cols-2">
                    {searchResult && searchResult.map((item, index) => (
                      <div key={index}>
                        <Card>
                          <CardBody>
                            <div>{item.object.name}</div>
                          </CardBody>
                          <CardFooter className="text-small justify-between">
                          <b>Similarity</b>
                          <p className="text-small">{item.similarity}</p>
                          </CardFooter>
                        </Card>
                      </div>
                    ))}
                    </div>
                  </>
                )
              }
              <Card>
              <CardBody>
                <p>Database size </p>
                <p><b>{size}</b> vectors</p>
              </CardBody>
            </Card>
              <Button
              color="danger"
              className="w-full max-w-xs p-2 border border-gray-300 rounded"
              onClick={e => {
                setInProgressLocal(false);
                deleteObjectStore('ObjectStoreName')
              }}
            >
              Delete DB
            </Button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
