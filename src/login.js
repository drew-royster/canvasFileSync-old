// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const { shell, remote, ipcRenderer } = require("electron");
const currentWindow = remote.getCurrentWindow();
const path = require("path");
const mainProcess = remote.require(path.join(__dirname, "../main.js"));
const startButton = document.querySelector("#start-sync");
const chooseDirectoryButton = document.querySelector("#chooseDirectory");
const chooseDirectoryError = document.querySelector("#choose-directory-error");
const instructure = document.querySelector("#instructure");
const go = document.querySelector("#go");
const log = require("electron-log");
const autocomplete = require('javascript-autocomplete');
window.$ = window.jQuery = require('jquery');
require("./crashReporter");
let rootDir = "";
log.info("in renderer");


function charsAllowed(value) {
    let allowedChars = new RegExp(/[A-Za-z ]+/);
    return (allowedChars.test(value) && !value.includes("."));
}

var xhr;
new autocomplete({
    selector: '#instructure',
    source: function (term, response) {
        if (charsAllowed(term)) {
            term = term.toLowerCase();
            try { xhr.abort(); } catch(e){}
            xhr = $.getJSON("https://canvas.instructure.com/api/v1/accounts/search?name=" + term,
                function(data){
                    response(data.slice(0, 6)); // Return first 6 items
                }
            ).done(() => {log.info("Domain search request successful")})
            .fail(() => {log.info("Domain search request failed")});
        }
    },
    renderItem: function (item, search){
        return '<div class="autocomplete-suggestion" data-domain="' + item['domain'] +
            '" data-val="'+search+'">' + item['name'] + '</div>';
    },
    onSelect: function (e, term, item) {
        let input = document.getElementById("instructure");
        log.info("Selected domain: " + item.getAttribute('data-domain'));
        input.value = item.getAttribute('data-domain');
        input.focus();
        input.selectionStart = input.selectionEnd = input.value.length;
    }
});

instructure.addEventListener('keyup', function (e) {
    if (e.key === "Enter" && instructure.value !== "" && instructure.value.includes(".")) {
        goLogin()
    }
});

go.addEventListener("click", () => {
    if (instructure.value !== "" && instructure.value.includes(".")) {
        goLogin()
    }
});

const goLogin = () => {
  go.classList.add('is-loading');
  log.info('Renderer: getting auth token');
  mainProcess.getAuthToken(currentWindow, instructure.value);
  log.info('got auth token')
};

startButton.addEventListener("click", event => {
  let validConfig = true;
  if (
    chooseDirectoryButton.innerHTML === "Choose Folder" ||
    chooseDirectoryButton.innerHTML === ""
  ) {
    log.error("Invalid Directory");
    showError(chooseDirectoryButton, chooseDirectoryError, "Invalid Directory");
    validConfig = false;
  }

  if (validConfig) {
    mainProcess.syncWithCanvas(
      currentWindow,
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
    const myNotification = new Notification(title, { body });
    if (title === "Sync Successful") {
      myNotification.onclick = () => {
        log.info("clicked on notification");
        shell.showItemInFolder(rootDir[0]);
      };
    }
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
