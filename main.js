// main.js
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const os = require("os");
const createScreenStreamServer = require("./server");

let mainWindow;
let server;

function getLocalIPs(port) {
  const nets = os.networkInterfaces();
  const results = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        results.push(`http://${net.address}:${port}/`);
      }
    }
  }
  return results;
}

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 400,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Just log the URLs in the console (for convenience)
  const urls = getLocalIPs(port);
  console.log("Access from other devices on LAN using:");
  urls.forEach((u) => console.log("  ", u));
}

app.whenReady().then(() => {
  const port = 8080;

  // Start HTTP server for screen stream
  server = createScreenStreamServer(port);

  // Create small GUI window
  createWindow(port);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(port);
    }
  });

  // send IPs to renderer
  ipcMain.handle("get-ip-list", () => {
    return getLocalIPs(port);
  });
});

app.on("window-all-closed", () => {
  // Keep server running even when window closed?
  // If you want to quit when window closes on non-macOS, uncomment:
  if (process.platform !== "darwin") {
    if (server) {
      server.close();
    }
    app.quit();
  }
});
