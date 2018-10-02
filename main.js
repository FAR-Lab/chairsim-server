const fs = require('fs');
const readline = require('readline');
const mime = require('mime');
const url = require('url');
const util = require('util');

const WebSocketServer = require('websocket').server;

const PORT = 8123;

let server = require('http').createServer(async (req, res) => {
  console.log("Got request!", req.method, req.url);
  
  let path = url.parse(req.url, true).pathname
  
  if (path.startsWith('/view/')) {
    let id = path.substr('/view/'.length).replace(/[^a-zA-Z0-9-]/g, '');
    console.log("parsed id", id);
    if ((await util.promisify(fs.stat)(`data/${id}.csv`)).isFile()) {
      console.log("file found!");
      let responseText = (await util.promisify(fs.readFile)('./viewer/index.html', 'utf8')).replace(/%RUN_ID%/g, id);
      console.log("responding with", responseText);
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.end(responseText);
      return;
    } else {
      console.log("didn't find data for id", id);
    }
  }
  
  switch (path) {
  case '/api/beginScan':
    runScan(req, res);
    return;
  case '/api/read':
    apiRead(req, res);
    return;
  case '/api/save':
    apiSave(req, res);
    return;

  // Serve react-built files. 
  // - In real production these would be served by nginx or similar. 
  // - In dev, they're served by react-stripts.
  // This is for pseudo-production: avoids react-scripts but isn't super efficient.
  default:
    let safePath = path.split('/').filter(e => ! e.startsWith('.')).join('/')
    if (safePath === '/' || /\/\d+/.test(safePath)) {
      safePath = '/index.html';
    }
    try {
      let fullPath = 'build' + safePath;
      if ((await util.promisify(fs.stat)(fullPath)).isFile()) {
        res.writeHead(200, {'Content-Type': mime.getType(safePath)});
        fs.createReadStream(fullPath).pipe(res);
      } else {
        console.log("unknown request", path);
        res.writeHead(404, {'Content-Type': 'text/html'});
        res.end("Couldn't find your URL...");
      }
    } catch (err) {
      console.log("Error reading static file?", err);
      res.writeHead(500, {'Content-Type': 'text/html'});
      res.end("Failed to load something...try again later?");
    }
  }
});
server.listen(PORT);

let headers = [];

let wsServer = new WebSocketServer({
  httpServer: server
});
wsServer.on('request', (request) => {
  let path = request.resource || "";
  console.log("WebSocket connection request for url:", path);
  
  if (path.startsWith('/dump/')) {
    let id = path.substr('/dump/'.length).replace(/[^a-zA-Z0-9-]/g, '');
    let outfile = fs.createWriteStream(`data/${id}.csv`, {flags: 'a'});

    let connection = request.accept(null, request.origin);    
    connection.on('message', (msg) => {
      // console.log("got message of type", msg.type, Object.keys(msg));
      switch (msg.type) {
      case 'utf8':
        outfile.write(msg.utf8Data);
        outfile.write("\n");
        // handleTextData(msg.utf8Data);
        break;
      case 'binary':
        let floats = new Float32Array(msg.binaryData.buffer);        
        outfile.write(floats.map(String).join(","));
        outfile.write("\n");
        // handleBuffer(msg.binaryData);
        break;
      }
    });    
    connection.on("close", () => {
      // cleanup
    })
  } else if (path.startsWith('/view/')) {
    let id = path.substr('/view/'.length).replace(/[^a-zA-Z0-9-]/g, '');
    let data = fs.createReadStream(`data/${id}.csv`, {flags: 'r', encoding: 'utf8'});
    let pipe = readline.createInterface({
      input: data,
      crlfDelay: Infinity
    });
    
    let connection = request.accept(null, request.origin);    
    pipe.on('line', (line) => {
      connection.send(line);
    });
    connection.on('close', () => {
      pipe.close();
    });
  }
});


function handleTextData(data) {
  headers = data.split(",");
}

function handleBuffer(buffer) {
  console.log("got", buffer.length, "bytes");
  let floats = new Float32Array(buffer.buffer);
  console.log("yielded", floats.length, "floats:", floats.map(String).join(",").slice(0, 80));
}