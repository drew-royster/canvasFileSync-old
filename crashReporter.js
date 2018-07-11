const { crashReporter } = require("electron");
const host = "http://localhost:3000/"; // #A
const config = {
  productName: "Canvas File Sync",
  companyName: "Drew Royster Productions",
  submitURL: host + "crashreports",
  uploadToServer: true // #B
};
crashReporter.start(config); // #C
module.exports = crashReporter;
