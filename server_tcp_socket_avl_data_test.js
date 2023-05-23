const express = require("express");
const app = express();

const net = require("net");
const Parser = require("teltonika-parser");
const binutils = require("binutils64");
const { Console } = require("console");

let server = net.createServer((c) => {
  console.log("client connected");
  c.on("end", () => {
    console.log("client disconnected");
  });

  c.on("data", (data) => {
    let buffer = data;
    let parser = new Parser(buffer);
    if (parser.isImei) {
      c.write(Buffer.alloc(1, 1)); // send ACK for IMEI
      console.log("send ACK for IMEI");
    } else {
      let avl = parser.getAvl();
      console.log(
        "parseRec",
        "Avl: " + JSON.stringify(avl),
        avl.records?.map(({ gps, timestamp, ioElements: elements }) => {
          let ioElements = {};
          for (let key in elements) {
            if (elements.hasOwnProperty(key)) {
              let data = elements[key].value;
              // let data = JSON.stringify(ioElements[key]);
              ioElements[elements[key].label] = data;
            }
          }
          return { gps, timestamp, ioElements };
        })
      );

      let writer = new binutils.BinaryWriter();
      writer.WriteInt32(avl.number_of_data);

      let response = writer.ByteBuffer;
      c.write(response); // send ACK
      console.log("send ACK");
    }
  });
});

server.on("error", (err) => {
  console.error(`Server error: ${err}`);
});

server.listen(5002, "0.0.0.0", () => {
  console.log("Server listening on 64.226.124.200:5002");
});

app.get("/endpoint", (req, res, next) => {
  res.status(200).json({
    success: true,
    data: {
      message: "Hello from endpoint => test2",
    },
  });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
