const fs = require("fs");
const path = require("path");
const request = require("request-promise");
let storage = (exports.storage = require("../data.json"));
const log = require("electron-log");

let headers = {};
let connected = false;
let syncResponse = {};

const options = {
  method: "GET",
  uri: `instructure.com/api/v1/users/self/courses?enrollment_state=active`,
  headers: headers,
  json: true,
  encoding: null
};

const getCanvasCourses = (exports.getCanvasCourses = async (
  schoolCode,
  developerKey
) => {
  try {
    storage.schoolCode = schoolCode;
    storage.developerKey = developerKey;
    canvasHeaders = { Authorization: `Bearer ${developerKey}` };
    if (!connected) {
      options.uri = `https://${schoolCode}.${options.uri}`;
      connected = true;
    }
    options.headers = canvasHeaders;
    let rootResponse = await request(options);
    return { success: true, message: "success", response: rootResponse };
  } catch (error) {
    log.error(error);
    if (
      error.message === '401 - {"errors":[{"message":"Invalid access token."}]}'
    ) {
      return { success: false, message: "Invalid Developer Key" };
    }
    return { success: false, message: error.message };
  }
});

const getCanvasFiles = (exports.getCanvasFiles = async (
  schoolCode,
  courses,
  rootDir
) => {
  try {
    log.info(rootDir);
    storage.syncDir = rootDir;
    for (let course of courses) {
      log.info("looping through courses");
      let courseName = course.name.split("|")[0];
      if (!fs.existsSync(path.join(rootDir, courseName))) {
        console.log(path.join(rootDir, courseName));
        fs.mkdirSync(path.join(rootDir, courseName));
      }

      await getFolderData(
        path.join(rootDir, courseName),
        `https://${schoolCode}.instructure.com/api/v1/courses/${
          course.id
        }/folders`
      );
    }
  } catch (error) {
    log.error(error);
  }

  log.info("got files successfully");
  return;
});

const getFolderData = async (folderPath, folderURL) => {
  try {
    let folderOptions = getUpdatedOptions(folderURL);
    let folderResponse = await request(folderOptions);
    for (let folder of folderResponse) {
      //course files folder is technically the root folder
      let currentFolderPath = "";
      if (folder.name !== "course files") {
        currentFolderPath = path.join(folderPath, folder.name);
      } else {
        currentFolderPath = folderPath;
      }

      //create folder if it doesn't exist
      if (!fs.existsSync(currentFolderPath)) {
        await fs.mkdirSync(currentFolderPath);
      }
      if (folder.folders_count !== 0 && folder.name !== "course files") {
        await getFolderData(currentFolderPath, folder.folders_url);
      }

      await getFileData(currentFolderPath, folder.files_url);
    }
  } catch (error) {
    log.error(error);
  }
  return;
};

const getFileData = async (currentPath, url, page = 1) => {
  try {
    let fileOptions = getUpdatedOptions(url);
    let filesResponse = await request(fileOptions);
    if (filesResponse.length === 10) {
      await getFileData(currentPath, `${url}?page=${page + 1}`, page + 1);
    }

    for (let file of filesResponse) {
      let updatedOnCanvas = new Date(file.updated_at);
      let fileDownloadOptions = getUpdatedOptions(file.url);
      let filePath = path.join(currentPath, file.display_name);

      log.info(filePath);
      log.info(fs.existsSync(filePath));
      if (!fs.existsSync(filePath) || !storage.files.hasOwnProperty(filePath)) {
        log.info("file doesn't exist or isn't present in data file");
        await request.get(fileDownloadOptions).then(async function(res) {
          const buffer = Buffer.from(res, "utf8");
          await fs.writeFileSync(filePath, buffer);
        });
        storage.files[filePath] = Date.now();
      } else {
        let lastCFSUpdate = new Date(storage.files[filePath]);

        if (updatedOnCanvas > lastCFSUpdate) {
          log.info("updated on canvas");
          await request.get(fileDownloadOptions).then(async function(res) {
            const buffer = Buffer.from(res, "utf8");
            await fs.writeFileSync(filePath, buffer);
          });
          storage.files[filePath] = Date.now();
        } else {
          log.info("no need to update");
        }
      }
    }
  } catch (error) {
    log.error(error);
  }

  return;
};

const saveFileMap = (exports.saveFileMap = () => {
  fs.writeFile("../data.json", JSON.stringify(storage), err => {
    if (err) {
      log.error(err);
      return;
    }
    log.info("Saved data.json");
  });
});

const isConnected = (exports.isConnected = () => {
  if (
    storage.syncDir !== "" &&
    storage.schoolCode !== "" &&
    storage.developerKey !== ""
  ) {
    return true;
  } else {
    return false;
  }
});

const getUpdatedOptions = url => {
  let updatedOptions = JSON.parse(JSON.stringify(options));
  updatedOptions.uri = url;
  return updatedOptions;
};
