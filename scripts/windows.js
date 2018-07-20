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
  outputDirectory: path.resolve(
    // E
    __dirname,
    "../build/Canvas-File-Sync-win32-x64-installer"
  ),
  icon: iconPath, // F
  setupIcon: iconPath, // G
  name: "Canvas File Sync",
  setupExe: "CanvasFileSync.exe",
  setupMsi: "CanvasFileSync.msi"
});
result
  .then(() => console.log("Success")) // H
  .catch(error => console.error("Failed", error));
