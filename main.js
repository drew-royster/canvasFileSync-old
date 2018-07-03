// Modules to control application life and create native browser window
const { app, BrowserWindow, Menu, shell, dialog, Tray } = require("electron");
const applicationMenu = require("./application-menus");
const path = require("path");
const moment = require("moment");
const canvasIntegration = require("./canvasIntegration");

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let tray = null;
let lastSynced = null;
let connected = false;

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({ width: 400, height: 450 });

  // and load the index.html of the app.
  mainWindow.loadFile("index.html");

  mainWindow.webContents.openDevTools();

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();

  // Emitted when the window is closed.
  mainWindow.on("closed", function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  if (app.dock) app.dock.hide();
  Menu.setApplicationMenu(applicationMenu);
  tray = new Tray(path.join(__dirname, "icons_normal/icons/png/32x32@2x.png"));
  tray.setPressedImage(
    path.join(__dirname, "icons_inverted/icons/png/32x32@2x.png")
  );
  updateMenu([
    {
      label: "Connect",
      click() {
        createWindow();
      },
      enabled: !connected
    },
    {
      label: "Disconnect",
      enabled: connected
    },
    {
      label: "Quit",
      click() {
        app.quit();
      },
      accelerator: "CommandOrControl+Q"
    }
  ]);
  tray.on("click", () => {
    console.log("clicked tray");
  });
});

// Quit when all windows are closed.
app.on("window-all-closed", function() {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", function() {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

const chooseDirectory = (exports.chooseDirectory = targetWindow => {
  console.log("choosing directory");
  const directory = dialog.showOpenDialog({ properties: ["openDirectory"] });
  targetWindow.webContents.send("directory-chosen", directory);
});

const syncWithCanvas = (exports.syncWithCanvas = async (
  targetWindow,
  developerKey,
  rootDir
) => {
  let syncResponse = await canvasIntegration.getCanvasCourses(developerKey);
  targetWindow.webContents.send("sync-response", syncResponse);
  if (syncResponse.success) {
    console.log("got canvas courses");
    targetWindow.hide();
    targetWindow.webContents.send(
      "show-notification",
      "Credentials Good",
      "Syncing Now"
    );
    let filesResponse = await canvasIntegration.getCanvasFiles(
      syncResponse.response,
      rootDir
    );
    canvasIntegration.saveFileMap();
    lastSynced = new Date(Date.now());
    console.log(lastSynced.toTimeString());
    targetWindow.webContents.send(
      "show-notification",
      "Sync Finished",
      `Files now available at ${rootDir}`
    );
    console.log("Sent notification");
    connected = true;
    updateMenu([
      {
        label: `Last Synced: ${lastSynced}`,
        enabled: false
      },
      {
        label: "Disconnect",
        enabled: connected
      },
      {
        label: "Quit",
        click() {
          app.quit();
        }
      }
    ]);
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
const updateMenu = template => {
  const menu = Menu.buildFromTemplate(template);
  tray.setContextMenu(menu);
};

// const returnDateMenuItem = () => {
//   if (lastSynced !== null) {
//     return { label: `Last Synced: ${lastSynced}`, enabled: false };
//   } else {
//     return null;
//   }
// };
