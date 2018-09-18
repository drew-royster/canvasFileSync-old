// const Application = require("spectron").Application;
// const canvasIntegration = require("../src/canvasIntegration");
// const assert = require("assert");
// const electronPath = require("electron"); // Require Electron from the binaries included in node_modules.
// const path = require("path");

// describe("Application launch", function() {
//   this.timeout(10000);

//   beforeEach(async function() {
//     this.app = new Application({
//       // Your electron path can be any binary
//       // i.e for OSX an example path could be '/Applications/MyApp.app/Contents/MacOS/MyApp'
//       // But for the sake of the example we fetch it from our node_modules.
//       path: electronPath,

//       // Assuming you have the following directory structure

//       //  |__ my project
//       //     |__ ...
//       //     |__ main.js
//       //     |__ package.json
//       //     |__ index.html
//       //     |__ ...
//       //     |__ test
//       //        |__ spec.js  <- You are here! ~ Well you should be.

//       // The following line tells spectron to look and use the main.js file
//       // and the package.json located 1 level above.
//       args: [path.join(__dirname, "..")]
//     });
//     // console.log(this.app)
//     return this.app.start();
//   });

//   afterEach(async function() {
//     if (this.app && this.app.isRunning()) {
//       return this.app.stop();
//     }
//   });

//   it("shows an initial window", async function() {
//     return this.app.client.getWindowCount().then(function(count) {
//       assert.equal(count, 1);
//     });
//   });

//   it("has correct title", async function() {
//     const title = await this.app.client.waitUntilWindowLoaded().getTitle();
//     assert.equal(title, "Canvas File Sync");
//   });

//   it("dev tools are not open", async function() {
//     const devToolsOpen = await this.app.client
//       .waitUntilWindowLoaded()
//       .browserWindow.isDevToolsOpened();
//     assert.equal(devToolsOpen, false);
//   });

  // it("clicking sync with no data shows errors", async function() {
  //   await this.app.client.waitUntilWindowLoaded();
  //   await this.app.client.click("#start-sync");
  //   let schoolError = await this.app.client.getText("#school-code-error");
  //   let devKeyError = await this.app.client.getText("#dev-key-error");
  //   let chooseDirectoryError = await this.app.client.getText(
  //     "#choose-directory-error"
  //   );
  //   await assert.equal(schoolError, "Invalid School");
  //   await assert.equal(devKeyError, "Invalid Developer Key");
  //   return assert.equal(chooseDirectoryError, "Invalid Directory");
  // });

  // it("clicking sync with no dev key or directory chosen shows errors", async function() {
  //   await this.app.client.waitUntilWindowLoaded();
  //   await this.app.client.$("#school-code").setValue("uvu");
  //   await this.app.client.click("#start-sync");
  //   let schoolError = await this.app.client.getText("#school-code-error");
  //   let devKeyError = await this.app.client.getText("#dev-key-error");
  //   let chooseDirectoryError = await this.app.client.getText(
  //     "#choose-directory-error"
  //   );
  //   await assert.equal(schoolError, "");
  //   await assert.equal(devKeyError, "Invalid Developer Key");
  //   return assert.equal(chooseDirectoryError, "Invalid Directory");
  // });

  // it("clicking sync with no dev key or directory chosen shows errors", async function() {
  //   await this.app.client.waitUntilWindowLoaded();
  //   await this.app.client.$("#developer-key").setValue(process.env.devKey);
  //   await this.app.client.click("#start-sync");
  //   let schoolError = await this.app.client.getText("#school-code-error");
  //   let devKeyError = await this.app.client.getText("#dev-key-error");
  //   let chooseDirectoryError = await this.app.client.getText(
  //     "#choose-directory-error"
  //   );
  //   await assert.equal(schoolError, "Invalid School");
  //   await assert.equal(devKeyError, "");
  //   return assert.equal(chooseDirectoryError, "Invalid Directory");
  // });

  // it("getting courses works", async function() {
  //   let response = await canvasIntegration.getCanvasCourses(
  //     process.env.accountDomain,
  //     process.env.devKey
  //   );
  //   assert.equal(response.success, true);
  // });
});
