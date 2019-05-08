const electron = require("electron");
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const Tray = electron.Tray;
const contextMenu = require("electron-context-menu");

const path = require("path");
const isDev = require("electron-is-dev");

let mainWindow;

contextMenu({
  showInspectElement: true
});

function createWindow() {
  const iconPath = path.join(__dirname, "../assets/icons/png/256x256.png");

  mainWindow = new BrowserWindow({
    width: 2560,
    height: 1440,
    icon: iconPath,
    webPreferences: {
      webviewTag: true,
      nodeIntegration: true
    }
  });
  mainWindow.loadURL(
    isDev
      ? "http://localhost:3000"
      : `file://${path.join(__dirname, "../build/index.html")}`
  );
  if (isDev) {
    // Open the DevTools.
    //BrowserWindow.addDevToolsExtension('<location to your react chrome extension>');
    mainWindow.webContents.openDevTools();
  }
  mainWindow.on("closed", () => (mainWindow = null));
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
