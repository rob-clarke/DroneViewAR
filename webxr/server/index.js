import https from 'https';
import fs from 'fs';
import path from 'path';
import { Server } from 'socket.io';

const host = '0.0.0.0';
const port = 8000;

// import { server as insecureServer } from './insecure.js';
// 
// const insecurePort = 8080;
// insecureServer.listen(insecurePort,host,() => {
//     console.log(`Server running on http://${host}:${insecurePort}`)
// });

const wwwRoot = process.env.WWW_ROOT || './dist';

function requestListener(req,res) {
    let filePath = `${wwwRoot}${req.url}`;

    if( filePath[filePath.length - 1] === '/') {
        filePath += 'index.html';
    }

    console.log(filePath);
    const extension = path.extname(filePath);
    let contentType = 'text/html';
    switch(extension) {
        case('.js'): {
            contentType = 'text/javascript'
            break;
        }
        case('.css'): {
            contentType = 'text/css';
            break;
        }
        case('.json'): {
            contentType = 'application/json';
            break;
        }
        case('.png'): {
            contentType = 'image/png';
            break;     
        } 
        case('.jpg'): {
            contentType = 'image/jpg';
            break;
        }
    }

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if(error.code == 'ENOENT'){
                const content = JSON.stringify({
                    success: false,
                    error: "File not found",
                });
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(content, 'utf-8');
            }
            else {
                const content = JSON.stringify({
                    success: false,
                    error: error.code,
                });
                res.writeHead(500);
                res.end(content, 'utf-8');
            }
        }
        else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
}

function socketListener(socket) {
    console.log("Socket connection");
    const sendData = (x,y,z) => {
        socket.emit('external-position',{
            x, y, z, t: 0
        });
    };
    const interval = setInterval(() => {
        fetch(process.env.GPS_POSITION_URL)
          .then(res => res.json())
          .then(obj => {
            // obj looks like:
            // {success:true|false,x,y,z}
            if( !obj.success ) {
                console.warn("Failed to get GPS position");
                return;
            }
            sendData(obj.x,obj.y,obj.z);
          })
            .catch(e => console.error(e));
    }, 1000);
    socket.on("positioning",(m) => console.log(m));
    socket.on("disconnect",() => clearInterval(interval));
}

const options = {
    key: fs.readFileSync('./key.pem'),
    cert: fs.readFileSync('./cert.pem'),
};

const httpServer = https.createServer(options,requestListener);
const socketServer = new Server(httpServer);

socketServer.on("connection", socketListener);

httpServer.listen(port,host,() => {
    console.log(`Server running on https://${host}:${port}/`);
});
