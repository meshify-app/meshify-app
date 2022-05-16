"use strict";

import {
  app,
  protocol,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
} from "electron";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";
import installExtension, { VUEJS_DEVTOOLS } from "electron-devtools-installer";
import authService from "./services/auth-service";
import fs from "fs";
const path = require("path");
const fileWatcher = require("chokidar");
import store from "./store";
const env = require("../env");
var { appData } = env;
if (process.env.ALLUSERSPROFILE != null) {
  appData = process.env.ALLUSERSPROFILE;
}

import { autoUpdater } from "electron-updater";

export default class AppUpdater {
  constructor() {
    const log = require("electron-log");
    log.transports.file.level = "debug";
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

//Multicast Client receiving sent messages
var PORT = 53281;
var MCAST_ADDR = "224.1.1.1"; //same mcast address as Server
var dgram = require("dgram");
var mclient = dgram.createSocket("udp4");

mclient.on("listening", function () {
  var address = mclient.address();
  console.log(
    "UDP Client listening on " + address.address + ":" + address.port
  );
  mclient.setBroadcast(true);
  mclient.setMulticastTTL(128);
  mclient.addMembership(MCAST_ADDR);
});

mclient.on("message", function (message, remote) {
  try {
    mainWindow.webContents.send("handle-dns", "" + message);
  } catch (e) {
    console.error("send dns query to renderer:", e.toString());
  }
});

mclient.on("error", (err) => {
  console.error(err);
});

mclient.bind(PORT, "10.1.1.192");

app.whenReady().then(() => {
  protocol.registerFileProtocol("app", (request, callback) => {
    const url = request.url.substr(6);
    callback({ path: path.normalize(`${__dirname}/${url}`) });
  });
});
const isDevelopment = process.env.NODE_ENV !== "production";

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { secure: true, standard: true } },
]);

let tray;

let mainWindow;

async function createWindow() {
  try {
    getConfig();
    createAuthWindow();
    authService.refreshTokens();
    // mainWindow = createAppWindow()
  } catch (err) {
    createAuthWindow();
    console.error("Error creating App Window : ", err);
  }
}

let config;
function getConfig() {
  try {
    config = JSON.parse(fs.readFileSync(appData + "\\Meshify\\meshify.conf"));
  } catch (err) {
    config = {};
  }
}

let authWindow;

function createAuthWindow() {
  destroyAuthWin();

  // Create the browser window.
  authWindow = new BrowserWindow({
    width: 600,
    height: 1000,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
    },
  });

  authWindow.loadURL(authService.getAuthenticationURL());

  const {
    session: { webRequest },
  } = authWindow.webContents;

  const filter = {
    urls: ["file:///callback*"],
  };

  webRequest.onBeforeRequest(filter, async ({ url }) => {
    await authService.loadTokens(url);
    createAppWindow();
    return destroyAuthWin();
  });

  authWindow.on("authenticated", () => {
    destroyAuthWin();
  });

  authWindow.on("closed", () => {
    authWindow = null;
  });
}

function destroyAuthWin() {
  if (!authWindow) return;
  authWindow.close();
  authWindow = null;
}

async function createAppWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      contextIsolation: false,
      enableRemoteModule: true,
      backgroundColor: "#333",
    },
  });

  // let application;
  // application.isQuiting = false;

  mainWindow.on("minimize", function (event) {
    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on("close", function (event) {
    event.preventDefault();
    mainWindow.hide();
    return false;
  });

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    await mainWindow.loadURL(process.env.WEBPACK_DEV_SERVER_URL);
  } else {
    createProtocol("app");
    // Load the index.html when not in development
    mainWindow.loadURL("app://./index.html");
  }
}

function startWatcher(path) {
  var watcher = fileWatcher.watch(path, {
    persistent: true,
  });

  function onWatcherReady() {
    console.log(
      "From here can you check for real changes, the initial scan has been completed."
    );
  }

  // Declare the listeners of the watcher
  watcher
    .on("add", function (path) {
      getConfig();
      console.log("Config = ", config);
      store.state.meshes = config.config;
      store.commit("meshes", config.config);

      try {
        mainWindow.webContents.send("handle-config", config.config);
      } catch (e) {
        console.error("send config to renderer:", e.toString());
      }

      console.log("File", path, "has been added");
    })
    .on("addDir", function (path) {
      console.log("Directory", path, "has been added");
    })
    .on("change", function (path) {
      getConfig();
      console.log("Config = ", config);
      store.state.meshes = config.config;
      store.commit("meshes", config.config);

      try {
        mainWindow.webContents.send("handle-config", config.config);
      } catch (e) {
        console.error("send config to renderer:", e.toString());
      }
      console.log("File", path, "has been changed");
    })
    .on("unlink", function (path) {
      console.log("File", path, "has been removed");
    })
    .on("unlinkDir", function (path) {
      console.log("Directory", path, "has been removed");
    })
    .on("error", function (error) {
      console.log("Error happened", error);
    })
    .on("ready", onWatcherReady)
    .on("raw", function (event, path, details) {
      // This event should be triggered everytime something happens.
      console.log("Raw event info:", event, path, details);
    });
}

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", async () => {
  getConfig();
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS_DEVTOOLS);
    } catch (e) {
      console.error("Vue Devtools failed to install:", e.toString());
    }
  }

  let filename = path.join(__static, "./meshify.png");
  console.log("Filename = ", filename);
  let icon = nativeImage.createFromPath(filename);
  tray = new Tray(icon);

  tray.on("click", function () {
    mainWindow.show();
  });

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Open",
      click: function () {
        mainWindow.show();
      },
    },
    {
      label: "Exit",
      click: function () {
        app.exit(0);
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip("meshify.app");
  tray.setTitle("meshify.app");

  createWindow();

  startWatcher(appData + "\\Meshify\\meshify.conf");
});

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === "win32") {
    process.on("message", (data) => {
      if (data === "graceful-exit") {
        app.quit();
      }
    });
  } else {
    process.on("SIGTERM", () => {
      app.quit();
    });
  }
}
