# DroneViewAR

WebXR based drone HUD for AR (Hololens 2).

Intention is to run server on a RasPi with access to GPS + MAVLink streams.

## Coordinate Alignment

The Hololens/WebXR API does not provide access to a globally stable coordinate
system (e.g. WGS84). Instead, measurements of the GPS position and the Hololens
position estimate are used to generate a transform from the global frame into
the Hololens/WebXR frame. This process is especially important to generate a
rotational alignment with grid north.

Users are asked to "Move around in the world" to allow the app to gather
GPS and corresponding Hololens measurements. For north alignment, the movement
needs to be significant enough for GPS position inaccuracies to be dealt with by
the least squares alignment. Using an RTK-enabled GPS unit will make this
a much less challenging requirement.

The Hololens coordinate system may drift over time, especially if users spend a
lot of time looking upwards without nearby features for the system to track.
Unfortunately, this is likely the exact sort of thing that will happen when
trying to look at drones... The rotational system should remain relatively
consistent, but may suffer from increased drift. Small drifts in horizontal
position should not be too obvious at typical drone operation distances.

## Loading Waypoints

With a drone selected, the system will attempt to load the flight plan for it
over MAVLink. The waypoints from this flight plan will be shown as a line in the
projected view.
