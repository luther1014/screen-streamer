// server.js
const express = require("express");
const screenshot = require("screenshot-desktop");

function createScreenStreamServer(port = 8080, fps = 5) {
  const app = express();
  const clients = new Set();

  // Simple web page for viewers
  app.get("/", (req, res) => {
    res.send(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Screen Stream</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              background: #111;
              color: #eee;
              font-family: sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
            }
            img {
              max-width: 100%;
              max-height: 90vh;
              border: 2px solid #444;
              box-shadow: 0 0 16px rgba(0,0,0,0.7);
            }
            code { background: #222; padding: 2px 4px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <h2>Live Screen Stream</h2>
          <p>If you can see the image below, the stream is working.</p>
          <img src="/stream" />
          <p>Share this URL with others on your network.</p>
        </body>
      </html>
    `);
  });

  // MJPEG stream endpoint
  app.get("/stream", (req, res) => {
    res.writeHead(200, {
      "Content-Type": "multipart/x-mixed-replace; boundary=frame",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      Pragma: "no-cache",
    });

    clients.add(res);
    console.log("Client connected, total:", clients.size);

    req.on("close", () => {
      clients.delete(res);
      console.log("Client disconnected, total:", clients.size);
    });
  });

  const server = app.listen(port, () => {
    console.log(`Screen stream server running on http://localhost:${port}/`);
    console.log(`Stream endpoint: http://localhost:${port}/stream`);
  });

  // Main capture loop
  async function captureLoop() {
    try {
      // Capture whole primary screen as JPEG
      const img = await screenshot({ format: "jpg" });

      if (clients.size > 0) {
        const header = `--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${img.length}\r\n\r\n`;
        const footer = "\r\n";

        for (const res of clients) {
          try {
            res.write(header);
            res.write(img);
            res.write(footer);
          } catch (err) {
            console.warn("Error writing to client, removing:", err.message);
            clients.delete(res);
          }
        }
      }
    } catch (err) {
      console.error("Capture error:", err.message);
    } finally {
      setTimeout(captureLoop, 1000 / fps); // control FPS
    }
  }

  captureLoop();

  return server;
}

module.exports = createScreenStreamServer;
