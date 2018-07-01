// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const { remote, ipcRenderer } = require("electron");
const currentWindow = remote.getCurrentWindow();
const mainProcess = remote.require("./main.js");
const devKey = document.querySelector("#developer-key");
const startButton = document.querySelector("#start-sync");
const chooseDirectoryButton = document.querySelector("#chooseDirectory");
const devKeyError = document.querySelector("#dev-key-error");
let rootDir = "";

startButton.addEventListener("click", event => {
  console.log("started sync from renderer");
  console.log(rootDir);
  console.log(devKey.value);
  mainProcess.syncWithCanvas(currentWindow, devKey.value, rootDir);
  console.log("finished sync");
});

chooseDirectoryButton.addEventListener("click", event => {
  mainProcess.chooseDirectory(currentWindow);
});

ipcRenderer.on("directory-chosen", (event, directory) => {
  chooseDirectoryButton.innerHTML = directory;
  rootDir = directory;
});

ipcRenderer.on("sync-response", (event, response) => {
  console.log(response);
  if (!response.success) {
    devKey.classList.add("is-danger");
    devKey.value = "";
    console.log(response.message);
    devKeyError.innerHTML = response.message;
  } else {
    devKey.classList.remove("is-danger");
    devKeyError.innerHTML = "";
  }
});

ipcRenderer.on("show-notification", (event, title, body) => {
  const myNotification = new Notification(title, { body }); // #A
});
