// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const { remote, ipcRenderer } = require("electron");
const currentWindow = remote.getCurrentWindow();
const path = require("path");
const mainProcess = remote.require(path.join(__dirname, "../main.js"));
const devKey = document.querySelector("#developer-key");
const startButton = document.querySelector("#start-sync");
const chooseDirectoryButton = document.querySelector("#chooseDirectory");
const chooseDirectoryError = document.querySelector("#choose-directory-error");
const devKeyError = document.querySelector("#dev-key-error");
const schoolCodeError = document.querySelector("#school-code-error");
const schoolCode = document.querySelector("#school-code");
const log = require("electron-log");
require("./crashReporter");
let rootDir = "";
log.info("in renderer");

startButton.addEventListener("click", event => {
  let validConfig = true;
  //arbitrary number 5. not sure exactly how long it could be
  if (devKey.value.length < 5) {
    log.error("Dev Key Invalid");
    showError(devKey, devKeyError, "Invalid Developer Key");
    validConfig = false;
  }
  if (schoolCode.value.length < 3) {
    log.error("Invalid School");
    showError(schoolCode, schoolCodeError, "Invalid School");
    validConfig = false;
  }
  if (
    chooseDirectoryButton.innerHTML === "Choose Directory" ||
    chooseDirectoryButton.innerHTML === ""
  ) {
    log.error("Invalid Directory");
    showError(chooseDirectoryButton, chooseDirectoryError, "Invalid Directory");
    validConfig = false;
  }

  if (validConfig) {
    mainProcess.syncWithCanvas(
      currentWindow,
      devKey.value,
      schoolCode.value,
      rootDir[0]
    );
    log.info("finished sync");
  } else {
    log.error(`Invalid Configuration`);
  }
});

chooseDirectoryButton.addEventListener("click", event => {
  log.info("attempting to choose directory");
  mainProcess.chooseDirectory(currentWindow);
});

ipcRenderer.on("directory-chosen", (event, directory) => {
  chooseDirectoryButton.innerHTML = directory;
  rootDir = directory;
});

ipcRenderer.on("sync-response", (event, response) => {
  log.info(response);
  if (!response.success) {
    showError(devKey, devKeyError, response.message);
  } else {
    devKey.classList.remove("is-danger");
    devKeyError.innerHTML = "";
  }
});

ipcRenderer.on("show-notification", (event, title, body) => {
  log.info(`title:${title}`);
  log.info(`body:${body}`);

  try {
    const myNotification = new Notification(title, { body }); // #A
  } catch (err) {
    log.error(err);
  }
});

const showError = (inputField, errorField, message) => {
  inputField.classList.add("is-danger");
  inputField.value = "";
  log.error(message);
  errorField.innerHTML = message;
};
