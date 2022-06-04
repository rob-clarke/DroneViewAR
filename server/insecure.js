import http from 'http';
import fs from 'fs';
import path from 'path';

const wwwRoot = 'client/insecure';

function requestListener(req,res) {
    let filePath = `./${wwwRoot}${req.url}`;

    if( filePath[filePath.length - 1] === '/') {
        filePath += 'index.html';
    }

    console.log(filePath);
    const extension = path.extname(filePath);
    let contentType = 'text/html';
    switch(extension) {
        case('.css'): {
            contentType = 'text/css';
            break;
        }
        case('.pem'): {
            contentType = 'application/x-pem-file';
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

export const server = http.createServer(requestListener);
