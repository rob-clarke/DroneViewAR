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

class Drone {
    constructor(sysid,compid) {
        this.sysid = sysid;
        this.compid = compid;
    }
    
    _getParams(origin) {
        const params = new URLSearchParams();
        params.append("sysid",this.sysid);
        params.append("compid",this.compid);
        params.append("lat_0",origin.lat);
        params.append("long_0",origin.lon);
        params.append("alt_0",origin.alt);
        return params;
    }
    
    async getPosition(origin) {
        const params = this._getParams(origin);
        const reqURL = `http://${process.env.MAV_HOST}/drone_rel?${params.toString()}`;
        const relPos = await fetch(reqURL).then(res => res.json());
        return relPos;
    }
    
    async getFlightPlan(origin) {
        const params = this._getParams(origin);
        const reqURL = `http://${process.env.MAV_HOST}/get_flightplan?${params.toString()}`;
        const flightPlan = await fetch(reqURL).then(res => res.json());
        return flightPlan;
    }
}

class Client {
    constructor(socket) {
        this.socket = socket;
        this.gpsOrigin = null;
        this.drones = {};
        
        this.gpsPositionInterval = setInterval(() => {this.updateGpsPosition()},1000);
        this.gpsOriginTimeout = setTimeout(() => {this.getGpsOrigin()},1000);
        this.droneListInterval = setInterval(() => {this.updateDroneList()},2000);
        this.dronesInterval = setInterval(() => {this.updateDrones()},500);
    }
    
    sendPositionData(x,y,z) {
        this.socket.emit('external-position',{
            x, y, z, t: 0
        });
    }
    
    getGpsOrigin() {
        fetch(`http://${process.env.GPS_HOST}/gps`)
          .then(res => res.json())
          .then(obj => {
            if( obj.success ) {
                this.gpsOrigin = obj.origin;
            }
          })
          .catch((e) => {
            console.warn(`Failed to get GPS origin: ${e}`);
            this.gpsOriginTimeout = setTimeout(() => {this.getGpsOrigin()},1000);
          });
    }
    
    updateGpsPosition() {
        fetch(`http://${process.env.GPS_HOST}/position`)
          .then(res => res.json())
          .then(obj => {
            // obj looks like:
            // {success:true|false,x,y,z}
            if( !obj.success ) {
                console.warn("Failed to get GPS position");
                return;
            }
            this.sendPositionData(obj.x,obj.y,obj.z);
          })
            .catch(e => console.error(e));
        }
    
    updateDroneList() {
        fetch(`http://${process.env.MAV_HOST}/drones`)
          .then((res) => res.json())
          .then(obj => {
            for( let i in obj ) {
                const [sysid,compid] = obj[i].split('/');
                if( ! this.drones.hasOwnProperty(obj[i]) ) {
                    this.drones[obj[i]] = new Drone(sysid,compid);
                }
            }
          });
    }
    
    async updateDrones() {
        if( this.gpsOrigin === null ) {
            return;
        }
        for( let key in this.drones ) {
            const drone = this.drones[key];
            try {
                const droneData = await drone.getPosition(this.gpsOrigin);
                this.socket.emit('drone-position',{id: drone.sysid, data: droneData});
            }
            catch(e) {
                // Do nothing...
                console.warn(`Error getting position: ${e}`);
            }
        }
    }
        
    cleanup() {
        clearInterval(this.gpsPositionInterval);
        clearTimeout(this.gpsOriginTimeout);
        clearInterval(this.droneListInterval);
        clearInterval(this.dronesInterval);
    }
}

let client = null;

function socketListener(socket) {
    console.log("Socket connection");
    client = new Client(socket);
    
    socket.on("positioning",(m) => console.log(m));
    socket.on("disconnect",() => {
        client.cleanup();
    });
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
