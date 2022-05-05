"use strict";

import { app, protocol, BrowserWindow } from "electron";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";
import installExtension, { VUEJS_DEVTOOLS } from "electron-devtools-installer";
import authService from "./services/auth-service";
import fs from "fs";

const isDevelopment = process.env.NODE_ENV !== "production";

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { secure: true, standard: true } },
]);

let gMeshes;

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

function getConfig() {
  global.gMeshes = fs.readFile(
    "c:\\ProgramData\\Meshify\\Meshify.conf",
    "utf8",
    function (err, data) {
      // Display the file content
      gMeshes = data;
      console.log("**Gmeshes**", gMeshes);
    }
  );
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
    mainWindow = createAppWindow();
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
    width: 800,
    height: 600,
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

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    await mainWindow.loadURL(process.env.WEBPACK_DEV_SERVER_URL);
  } else {
    createProtocol("app");
    // Load the index.html when not in development
    mainWindow.loadURL("app://./index.html");
  }
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
  createWindow();
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
