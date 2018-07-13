const { crashReporter } = require("electron");
const host = "http://localhost:3000/"; // #A
const config = {
  productName: "Fire Sale",
  companyName: "Electron in Action",
  submitURL: host + "crashreports",
  uploadToServer: true // #B
};
crashReporter.start(config); // #C
console.log("[INFO] Crash reporting started.", crashReporter);
module.exports = crashReporter;
