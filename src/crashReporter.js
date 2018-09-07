const { crashReporter } = require("electron");
const request = require("request");
const host = "https://cfs.handsofblue67.com/"; // #A
const config = {
  productName: "Canvas File Sync",
  companyName: "Drew Royster Productions",
  submitURL: host + "crashreports",
  uploadToServer: true // #B
};
crashReporter.start(config); // #C

const sendUncaughtException = error => {
  // #A
  const { productName, companyName } = config;
  request.post(host + "uncaughtexceptions", {
    // #B
    form: {
      _productName: productName,
      _companyName: companyName,
      _version: manifest.version,
      platform: process.platform,
      process_type: process.type,
      ver: process.versions.electron,
      error: {
        // C
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    }
  });
};

if (process.type === "browser") {
  process.on("uncaughtException", sendUncaughtException);
} else {
  window.addEventListener("error", sendUncaughtException);
}

console.log("Crash Reporting started", crashReporter);
module.exports = crashReporter;
