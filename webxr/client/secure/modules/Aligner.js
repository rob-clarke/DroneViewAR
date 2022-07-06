import * as math from "npm:mathjs";

import { CoordinateBuffer } from "./CoordinateTracker.js";

export default class Aligner {
    AlignmentPhases = {
        ACQUIRING_INITIAL: 0,
        WAITING_FOR_DISTAL: 1,
        ACQUIRING_DISTAL: 2,
        ALIGNING: 3,
        ALIGNED: 4,
    }
    
    MAX_STDDEV = 0.25;
    MIN_SEPARATION = 5;
    
    constructor(min_acquire=10,num_obervations=15) {
        this.min_acquire = min_acquire;
        this.phase = this.AlignmentPhases.ACQUIRING_INITIAL;
        this.internals = new CoordinateBuffer(num_obervations);
        this.externals = new CoordinateBuffer(num_obervations);
        this.latest_points = {
            internal: math.zeros(2,1),
            external: math.zeros(2,1),
        };
        this.initial_points = {
            internal: math.zeros(2,1),
            external: math.zeros(2,1),
        };
        this.distal_points = {
            internal: math.zeros(2,1),
            external: math.zeros(2,1),
        };
        this.yaw = 0;
        this.translation = math.zeros(2,1);
    }
    
    _calcDistanceSqd(a,b) {
        const delta = math.subtract(a,b);
        return Math.pow(delta._data[0][0],2) + Math.pow(delta._data[1][0],2);
    }
    
    _calcPositionStats(buffer) {
        let sum_point = math.zeros(2,1);
        for( let i = 0; i < buffer.obtained; i++ ) {
            sum_point = math.add(sum_point, buffer.get_vector(i));
        }
        const mean_point = math.multiply(1/buffer.obtained, sum_point);
        let sum_dist = 0;
        for( let i = 0; i < buffer.obtained; i++ ) {
            sum_dist += this._calcDistanceSqd(buffer.get_vector(i),mean_point);
        }
        const mean_dist = sum_dist / buffer.obtained;
        return {
            mean: mean_point,
            stddev: mean_dist,
        };
    }
    
    calcPositionStats() {
        const internal = this._calcPositionStats(this.internals);
        const external = this._calcPositionStats(this.externals);
        return {internal,external};
    }
    
    insertPositions(internal,external) {
        this.internals.insert(internal,0);
        this.externals.insert(external,0);
        this.latest_points = {
            internal,
            external,
        };
    }
    
    update() {
        switch(this.phase) {
            case(this.AlignmentPhases.ACQUIRING_INITIAL): {
                if( this.internals.obtained < this.min_acquire
                    || this.externals.obtained < this.min_acquire )
                {
                    // Not enough points obtained yet
                    return `Not enough initial points\nObtained: ${this.internals.obtained}`;
                }
                const { internal, external } = this.calcPositionStats();
                if( internal.stddev > this.MAX_STDDEV
                    || external.stddev > this.MAX_STDDEV )
                {
                    // Position not stabilised
                    return `Initial not stablised\nInternal: ${internal.stddev}\nExternal: ${external.stddev}`;
                }
                this.initial_points = {
                    internal: internal.mean,
                    external: external.mean,
                };
                this.phase = this.AlignmentPhases.WAITING_FOR_DISTAL;
            }
            case(this.AlignmentPhases.WAITING_FOR_DISTAL): {
                const [x,y] = this.latest_points.external;
                const external_vect = math.matrix([[x],[y]]);
                const delta = this._calcDistanceSqd(external_vect,this.initial_points.external);
                if( delta < Math.pow(this.MIN_SEPARATION,2) ) {
                    // Insufficient separation
                    return `Insufficient separation\nCurrently: ${Math.sqrt(delta)}`;
                }
                this.internals = new CoordinateBuffer(this.internals.length);
                this.externals = new CoordinateBuffer(this.internals.length);
                this.phase = this.AlignmentPhases.ACQUIRING_DISTAL;
            }
            case(this.AlignmentPhases.ACQUIRING_DISTAL): {

                if( this.internals.obtained < this.min_acquire
                    || this.externals.obtained < this.min_acquire )
                {
                    // Not enough points obtained yet
                    return `Not enough distal points\nObtained: ${this.internals.obtained}`;
                }
                const { internal, external } = this.calcPositionStats();
                if( internal.stddev > this.MAX_STDDEV
                    || external.stddev > this.MAX_STDDEV )
                {
                    // Position not stabilised
                    return `Distal not stablised\nInternal: ${internal.stddev}\nExternal: ${external.stddev}`;
                }
                this.distal_points = {
                    internal: internal.mean,
                    external: external.mean,
                };
                this.phase = this.AlignmentPhases.ALIGNING;
            }
            case(this.AlignmentPhases.ALIGNING): {
                const internal_vec = math.subtract(this.distal_points.internal,this.initial_points.internal);
                const external_vec = math.subtract(this.distal_points.external,this.initial_points.external);
                
                const internal_heading = Math.atan2(internal_vec._data[1][0],internal_vec._data[0][0]);
                const external_heading = Math.atan2(external_vec._data[1][0],external_vec._data[0][0]);
                
                this.yaw = internal_heading - external_heading;
                this.translation = math.subtract(this.initial_points.external,this.initial_points.internal);
                
                this.phase = this.AlignmentPhases.ALIGNED;
            }
            case(this.AlignmentPhases.ALIGNED): {
                return "Aligned!"
            }
        }
    }
    
    
}
