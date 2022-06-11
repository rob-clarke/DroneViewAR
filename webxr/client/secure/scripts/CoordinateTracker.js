import SVD from "../svd.js.js";

class CoordinateBuffer {
    constructor(length) {
        this.length = length;
        this.coordinates = new Float32Array(length*3);
        this.times = new Uint32Array(length);
        this.head = 0;
    }

    insert(x,y,z,t) {
        this.coordinates[this.head*3+0] = x;
        this.coordinates[this.head*3+1] = y;
        this.coordinates[this.head*3+2] = z;
        this.times[this.head] = t;
        this.head = (this.head + 1) % this.length;
    }

    get_vector(i) {
        return math.matrix([
            [this.coordinates[i+0]],
            [this.coordinates[i+1]],
            [this.coordinates[i+2]]
        ]);
    }

}

export default class CoordinateTracker {

    constructor(length = 200) {
        this.externalCoords = new CoordinateBuffer(length);
        this.internalCoords = new CoordinateBuffer(length);
        this.obtained = 0;
        this.transform_matrix = math.identity(4);
    }

    updateInternalCoords(x,y,z,t) {
        this.internalCoords.insert(x,y,z,t);
    }

    updateExternalCoords(x,y,z,t) {
        this.externalCoords.insert(x,y,z,t);
        this.obtained += 1;
    }

    updateTransformMatrix() {
        // https://en.wikipedia.org/wiki/Kabsch_algorithm
        // https://towardsdatascience.com/the-definitive-procedure-for-aligning-two-sets-of-3d-points-with-the-kabsch-algorithm-a7ec2126c87e
        const expected_points = this.obtained > 200 ? 200 : this.obtained;
        let sum_internal = math.zeros(3,1);
        let sum_external = math.zeros(3,1);

        for( let i = 0; i < expected_points; i++ ) {
            sum_internal = math.add(sum_internal,this.internalCoords.get_vector(i));
            math.add(sum_external,this.externalCoords.get_vector(i));
        }

        sum_internal = math.multiply(1/expected_points,sum_internal);
        sum_external = math.multiply(1/expected_points,sum_external);

        let P_int = math.zeros(expected_points,3);
        let Q_ext = math.zeros(expected_points,3);

        for( let i = 0; i < expected_points; i++ ) {
            const internal = this.internalCoords.get_vector(i);
            P_int._data[i][0] = internal._data[0][0] - sum_internal._data[0][0];
            P_int._data[i][1] = internal._data[1][0] - sum_internal._data[1][0];
            P_int._data[i][2] = internal._data[2][0] - sum_internal._data[2][0];

            const external = this.internalCoords.get_vector(i);
            Q_ext._data[i][0] = external._data[0][0] - sum_external._data[0][0];
            Q_ext._data[i][1] = external._data[1][0] - sum_external._data[1][0];
            Q_ext._data[i][2] = external._data[2][0] - sum_external._data[2][0];
        }

        const H = math.multiply(math.transpose(Q_ext),P_int);

        const {u,v} = SVD(H._data);

        const R = math.multiply(v,math.transpose(u));
        
        const translation = math.subtract(sum_external,sum_internal);

        this.transform_matrix = math.matrix([
            [...R[0], translation._data[0][0] ],
            [...R[1], translation._data[1][0] ],
            [...R[2], translation._data[2][0] ],
            [0, 0, 0, 1]
        ]);
    }

    transform(x,y,z) {
        result = math.multiply(this.transform_matrix,math.matrix([[x],[y],[z],[1]]));
        return {
            x: result[0],
            y: result[1],
            z: result[2],
        };
    }

}
