const { app, BrowserWindow, Menu, shell } = require("electron");
const mainProcess = require("./main");

const template = [
  {
    label: "Edit",
    submenu: [
      {
        label: "Copy",
        accelerator: "CommandOrControl+C", //B
        role: "copy" //C
      },
      {
        label: "Paste",
        accelerator: "CommandOrControl+V",
        role: "paste"
      },
      {
        label: "Select All",
        accelerator: "CommandOrControl+A",
        role: "selectall"
      }
    ]
  }
];

module.exports = Menu.buildFromTemplate(template);
