const { createWindowsInstaller } = require("electron-winstaller");
const path = require("path");

const iconPath = path.resolve(__dirname, "../icons_normal/icons/win/icon.ico"); // B
const result = createWindowsInstaller({
  // C
  title: "Canvas File Sync",
  authors: "Drew Royster",
  appDirectory: path.resolve(
    // D
    __dirname,
    "../build/Canvas File Sync-win32-x64"
  ),
  icon: iconPath, // F
  setupIcon: iconPath, // G
  name: "CanvasFileSync",
  exe: "Canvas File Sync.exe"
});
result
  .then(() => console.log("Success")) // H
  .catch(error => console.error("Failed", error));
