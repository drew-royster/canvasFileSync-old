// Modules to control application life and create native browser window
const { app, BrowserWindow, Menu, dialog, Tray } = require("electron");
const request = require('request-promise');
const applicationMenu = require("./src/application-menus");
const path = require("path");
const moment = require("moment");
const canvasIntegration = require("./src/canvasIntegration");
const log = require("electron-log");
const Store = require('electron-store');
const store = new Store();
require("./src/crashReporter");
if (require("electron-squirrel-startup")) return;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let tray = null;
let lastSynced = new Date(store.get('lastUpdated'));
let connected = false;

let notConnectedMenu = [
  {
    label: "Connect",
    click() {
      createWindow();
    },
    enabled: true
  },
  {
    label: "Disconnect",
    enabled: false
  },
  {
    label: "Quit",
    click() {
      app.quit();
    },
    accelerator: "CommandOrControl+Q"
  }
];

let connectingMenu = [
  {
    label: "Syncing...",
    icon: path.join(__dirname, "icons_normal/loading.png"),
    enabled: false
  },
  {
    label: "Disconnect",
    enabled: false
  },
  {
    label: "Quit",
    click() {
      app.quit();
    },
    accelerator: "CommandOrControl+Q"
  }
];

const getUpdatedConnectedMenu = lastSynced => {
  return [
    {
      label: `Last Synced: ${moment(lastSynced).fromNow()}`,
      enabled: false
    },
    {
      label: "Sync Now",
      enabled: true,
      click() {
        repeatingSyncWithCanvas()
      }
    },
    {
      label: "Disconnect",
      enabled: true,
      click() {
        disconnect();
      }
    },
    {
      label: "Quit",
      click() {
        app.quit();
      }
    }
  ];
};

const createWindow = (exports.createWindow = () => {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, "src/login.html"));

  // Open the DevTools.
  if (process.env.debug === "true") {
    mainWindow.webContents.openDevTools();
  }

  // Emitted when the window is closed.
  mainWindow.on("closed", function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  try {
    if (app.dock) app.dock.hide();
    if (process.platform !== "darwin") {
      Menu.setApplicationMenu(null);
    } else {
      Menu.setApplicationMenu(applicationMenu);
    }
    tray = new Tray(
      path.join(__dirname, "icons_normal/icons/png/32x32@2x.png")
    );
    tray.setPressedImage(
      path.join(__dirname, "icons_inverted/icons/png/32x32@2x.png")
    );

    //handles windows
    tray.on("right-click", async () => {
      log.info("right clicked on tray");
      if (connected) {
        updateMenu(getUpdatedConnectedMenu(lastSynced));
      }
    });

    //handles mac
    tray.on("mouse-enter", async () => {
      log.info("mouse has entered area");
      if (connected) {
        updateMenu(getUpdatedConnectedMenu(lastSynced));
      }
    });

    if (canvasIntegration.isConnected()) {
      connected = true;
      updateMenu(getUpdatedConnectedMenu(lastSynced));
    } else {
      updateMenu(notConnectedMenu);
      // A bug is causing this window to immediately disappear.
      // createWindow();
    }
    let minutes = 5;
    let interval = minutes * 60 * 1000;
    setInterval(() => {
      if (connected) repeatingSyncWithCanvas();
    }, interval);
  } catch (err) {
    log.error(err);
  }
});

app.setLoginItemSettings({openAtLogin: true, openAsHidden: true});

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

exports.chooseDirectory = targetWindow => {
  log.info("choosing directory");
  const directory = dialog.showOpenDialog({ properties: ["openDirectory"] });
  targetWindow.webContents.send("directory-chosen", directory);
};

exports.getAuthToken = async (targetWindow, accountDomain) => {
  log.info('setting account domain');
  store.set("files", {});
  store.set("accountDomain", accountDomain);
  let schoolURL = `https://${accountDomain}`;
  targetWindow.loadURL(schoolURL);
  let mainSession = targetWindow.webContents.session;
  let longTermToken = '';

  targetWindow.on('page-title-updated', async function(event, pageTitle) {
    if (pageTitle === "Dashboard") {
      log.info('in canvas now creating auth token');
      mainSession.cookies.get({}, async (error, cookies) => {
        let authenticity_token = '';
        let canvas_session_token = '';
        let purpose = 'canvasFileSync';
        if (longTermToken === '') {
          for (let cookie of cookies) { 
            if (cookie.name === '_csrf_token') {
              authenticity_token = cookie.value
            }
            if (cookie.name === 'canvas_session') {
              canvas_session_token = cookie.value
            }
          }
          var options = { 
            method: 'POST',
            url: `https://${accountDomain}/profile/tokens`,
            headers: 
            { 
              'Cache-Control': 'no-cache',
              'X-Requested-With': 'XMLHttpRequest',
              Accept: 'application/json, text/javascript, application/json+canvas-string-ids, */*; q=0.01',
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'X-CSRF-Token': authenticity_token,
              Cookie: `canvas_session=${canvas_session_token}; _csrf_token=${authenticity_token}` 
            },
            body: `authenticity_token=${authenticity_token}&access_token%5Bpurpose%5D=${purpose}` 
          };
  
          let response = await request(options);
          store.set("developerKey", JSON.parse(response).visible_token);
          targetWindow.loadFile(path.join(__dirname, "src/setup.html"));
        }
      }) 
    }
  })
};

exports.syncWithCanvas = async (
  targetWindow,
  rootDir
) => {
  try {
    updateMenu(connectingMenu);
    let syncResponse = await canvasIntegration.getCanvasCourses(
      store.get("accountDomain"),
      store.get("developerKey")
    );
    targetWindow.webContents.send("sync-response", syncResponse);
    if (syncResponse.success) {
      targetWindow.hide();
      targetWindow.webContents.send(
        "show-notification",
        `Starting Sync`,
        `First sync may take a while...`
      );
      log.info("hid window");
      let filesResponse = await canvasIntegration.getCanvasFiles(
        store.get("accountDomain"),
        syncResponse.response,
        rootDir
      );

      log.info("got canvas files");
      connected = true;
      updateDate();

      log.info("updated the date");

      targetWindow.webContents.send(
        "show-notification",
        `Sync Successful`,
        `Files available at ${rootDir}`
      );

      log.info("Sent notification");
      updateMenu(getUpdatedConnectedMenu(lastSynced));
    }
  } catch (err) {
    log.error(err);
  }
};

const repeatingSyncWithCanvas = async () => {
  try {
    log.info("setting menu to connecting menu");
    updateMenu(connectingMenu);
    log.info("set menu to connecting menu");
    let getCanvasCoursesResponse = await canvasIntegration.getCanvasCourses(
      store.get("accountDomain"),
      store.get("developerKey")
    );
  
    if (getCanvasCoursesResponse.success) {
      if(await canvasIntegration.newFilesExist(getCanvasCoursesResponse.response)) {
        log.info('new files exist');
        let filesResponse = await canvasIntegration.getCanvasFiles(
          store.get("accountDomain"),
          getCanvasCoursesResponse.response,
          store.get("syncDir")
        );
      } else {
        log.info('no new files exist')
      }
      updateDate();
      log.info("setting menu to connected menu");
      updateMenu(getUpdatedConnectedMenu(lastSynced));
    }
  } catch(err) {
    log.error(err)
  }
};

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
const updateMenu = template => {
  const menu = Menu.buildFromTemplate(template);
  tray.setContextMenu(menu);
};

const updateDate = () => {
  lastSynced = new Date(Date.now());
  store.set("lastUpdated", lastSynced);
};

const disconnect = () => {
  log.info("Disconnecting");
  connected = false;
  store.delete("syncDir");
  store.delete("files", {});
  store.delete("accountDomain");
  store.delete("developerKey");
  store.delete("lastUpdated");
  updateMenu(notConnectedMenu);
};
