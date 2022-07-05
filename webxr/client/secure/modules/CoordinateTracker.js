import * as math from "npm:mathjs";
import { SVD } from "npm:svd-js";


/*
WebXR coordinates are by default:
    x_w -> right of origin
    y_w -> up (gravity aligned)
    z_w -> "towards camera" from origin

NED coordinates:
    x_g -> North
    y_g -> East
    z_g -> Down

Assuming x_w is north aligned, transform is:
    x_w = x_g
    y_w = -z_g
    z_w = y_g
*/

class CoordinateBuffer {
    constructor(length,dim=2) {
        this.length = length;
        this.dim = dim;
        this.coordinates = new Float32Array(length*dim);
        this.times = new Uint32Array(length);
        this.head = 0;
    }

    insert(position,t) {
        [...Array(this.dim).keys()].map((i) => {
            this.coordinates[this.head*this.dim+i] = position[i];
        });
        this.times[this.head] = t;
        this.head = (this.head + 1) % this.length;
    }

    get_vector(i) {
        return math.matrix([...Array(this.dim).keys()].map(
            (j) => [this.coordinates[i+j]]
        ));
    }

}

export default class CoordinateTracker {

    constructor(length = 200) {
        this.externalCoords = new CoordinateBuffer(length);
        this.internalCoords = new CoordinateBuffer(length);
        this.obtained = 0;
        this.transform_matrix = math.identity(3);
    }

    updateInternalCoords(x,z,t) {
        this.internalCoords.insert([x,z],t);
    }

    updateExternalCoords(x,y,t) {
        this.externalCoords.insert([x,y],t);
        this.obtained += 1;
    }

    getSpread() {
        const expected_points = this.obtained > 200 ? 200 : this.obtained;
        let sum_external = math.zeros(2,1);

        for( let i = 0; i < expected_points; i++ ) {
            math.add(sum_external, this.externalCoords.get_vector(i));
        }
        
        mean_point = math.multiply(1/expected_points, sum_external);
        
        let max_dist = 0;
        for( let i = 0; i < expected_points; i++ ) {
            let dist = math.norm(
                math.subtract(this.externalCoords.get_vector(i), mean_point)
            );
            if( dist > max_dist ) {
                max_dist = dist;
            } 
        }
        
        return max_dist;
    }
    
    updateTransformMatrix() {
        // https://en.wikipedia.org/wiki/Kabsch_algorithm
        // https://towardsdatascience.com/the-definitive-procedure-for-aligning-two-sets-of-3d-points-with-the-kabsch-algorithm-a7ec2126c87e
        const expected_points = this.obtained > 200 ? 200 : this.obtained;
        let sum_internal = math.zeros(2,1);
        let sum_external = math.zeros(2,1);

        for( let i = 0; i < expected_points; i++ ) {
            sum_internal = math.add(sum_internal,this.internalCoords.get_vector(i));
            sum_external = math.add(sum_external,this.externalCoords.get_vector(i));
        }

        sum_internal = math.multiply(1/expected_points,sum_internal);
        sum_external = math.multiply(1/expected_points,sum_external);

        let P_int = math.zeros(expected_points,2);
        let Q_ext = math.zeros(expected_points,2);

        for( let i = 0; i < expected_points; i++ ) {
            const internal = this.internalCoords.get_vector(i);
            P_int._data[i][0] = internal._data[0][0] - sum_internal._data[0][0];
            P_int._data[i][1] = internal._data[1][0] - sum_internal._data[1][0];

            const external = this.internalCoords.get_vector(i);
            Q_ext._data[i][0] = external._data[0][0] - sum_external._data[0][0];
            Q_ext._data[i][1] = external._data[1][0] - sum_external._data[1][0];
        }

        const H = math.multiply(math.transpose(Q_ext),P_int);

        const {u,v} = SVD(H._data);

        const R = math.multiply(v,math.transpose(u));
        
        const translation = math.subtract(sum_external,sum_internal);

        this.transform_matrix = math.matrix([
            [...R[0], translation._data[0][0] ],
            [...R[1], translation._data[1][0] ],
            [  0,  0,                       1 ]
        ]);
    }
}
