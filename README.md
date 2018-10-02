# chairsim-server
A server for tracking user input from the chairbot grand central sim

Build the WebGL output into build in this directory.

Then: 

```shell
$ npm install
$ nodemon main.js
```

...should get your server running on port 8123. Visit it at http://localhost:8123/

Send a path to set max speed and camera height. The last 4 bits of the number that makes up the path are used to determine the the height and max speed of the chairbot.

So, if last 4 bits of path number are ABCD, then:

| AB | Max Speed |
| -- | --------- |
| 00 | 1.0       |
| 01 | 0.5       |
| 10 | 2.0       |
| 11 | 3.5       |

...and...

| CD | Camera Height |
| -- | ------------- |
| 00 | 0.18          |
| 01 | 0.50          |
| 10 | 1.0           |
| 11 | 2.0           |

So, for example, going to http://localhost:8123/15 yields max speed of 3.5m/s and a 2m high camera. So does http://localhost:8123/10735 -- and since that path is the unique identifier that ties the data to that run, you can generate arbitrary numerical IDs and set the last four bits to whatever you want max speed and camera height to be.
