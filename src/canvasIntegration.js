const fs = require("fs");
const path = require("path");
const request = require("request-promise");
// let storage = (exports.storage = require("../data.json"));
const log = require("electron-log");
const Store = require('electron-store');
const store = new Store();

let headers = {};
let connected = false;

const options = {
  method: "GET",
  uri: `instructure.com/api/v1/users/self/courses?enrollment_state=active`,
  headers: headers,
  json: true,
  encoding: null
};

exports.getCanvasCourses = async (
  schoolCode,
  developerKey
) => {
    let canvasHeaders;
    try {
        store.set("schoolCode", schoolCode);
        store.set("developerKey", developerKey);
        canvasHeaders = {Authorization: `Bearer ${developerKey}`};
        if (!connected) {
            options.uri = `https://${schoolCode}.${options.uri}`;
            connected = true;
        }
        options.headers = canvasHeaders;
        let rootResponse = await request(options);
        return {success: true, message: "success", response: rootResponse};
    } catch (error) {
        log.error(error);
        if (
            error.message === '401 - {"errors":[{"message":"Invalid access token."}]}'
        ) {
            return {success: false, message: "Invalid Developer Key"};
        }
        return {success: false, message: error.message};
    }
};

exports.getCanvasFiles = async (
  schoolCode,
  courses,
  rootDir
) => {
  try {
    log.info(rootDir);
    store.set("syncDir", rootDir);
    for (let course of courses) {
      log.info(`${course.name}\n`);
      if (await hasAccessToFilesAPI(course.id)) {
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
    }
  } catch (error) {
    log.error(error);
  }

  log.info("got files successfully");
};

const getFolderData = async (folderPath, folderURL) => {
  try {
    let folderOptions = getUpdatedOptions(folderURL);
    let folderResponse = await request(folderOptions);
    for (let folder of folderResponse) {
      //course files folder is technically the root folder
      let currentFolderPath = "";
      log.info(`${folder.name} updated recently getting new files`);
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
      log.info(file.uuid);

      log.info(filePath);
      log.info(fs.existsSync(filePath));
      if (!fs.existsSync(filePath) || !store.get("files").hasOwnProperty(file.uuid)) {
        log.info(`${filePath} doesn't exist or isn't present in data file`);
        await request.get(fileDownloadOptions).then(async function(res) {
          const buffer = Buffer.from(res, "utf8");
          await fs.writeFileSync(filePath, buffer);
        });
        store.set(`files.${file.uuid}`, { last_updated: Date.now(), path: filePath });
      } else {
        let lastCFSUpdate = new Date(store.get(`files.${file.uuid}`).last_updated);

        if (updatedOnCanvas > lastCFSUpdate) {
          log.info("updated on canvas");
          await request.get(fileDownloadOptions).then(async function(res) {
            const buffer = Buffer.from(res, "utf8");
            await fs.writeFileSync(filePath, buffer);
          });
          store.set(`files.${file.uuid}`, { last_updated: Date.now(), path: filePath });
        } else {
          log.info("no need to update");
        }
      }
    }
  } catch (error) {
    log.error(error);
  }
};

exports.isConnected = () => {
  try {
    if (
      store.get('syncDir') !== undefined &&
      store.get('schoolCode') !== undefined &&
      store.get('developerKey') !== undefined
    ) {
      log.info(store.get('syncDir'));
      return true;
    } else {
      return false;
    }
  }
  catch (err) {
    log.error(err)
  }
};

exports.newFilesExist = async courses => {
  try {
    for (let course of courses) {
      if (await newFileInCourse(course.id)) {
        return true
      }
    } return false
  }
  catch (err) {
    log.error(err)
  }
};

const getUpdatedOptions = url => {
  let updatedOptions = JSON.parse(JSON.stringify(options));
  updatedOptions.uri = url;
  return updatedOptions;
};

const newFileInCourse = async courseID => {
  let newFileOptions = getUpdatedOptions(`https://${store.get("schoolCode")}.instructure.com/api/v1/courses/${courseID}/files?sort=updated_at&order=desc`);
  try {
    log.info(`requesting: ${newFileOptions.uri}`);
    let latestFiles = await request(newFileOptions);
    if (new Date(latestFiles[0].updated_at) > new Date(store.get("lastUpdated"))) {
      log.info('true');
      return true
    } else {
      log.info('false');
      return false
    } 
  } catch(err) {
    if (err === `StatusCodeError: 401 - {"status":"unauthorized","errors":[{"message":"user not authorized to perform that action"}]}`) {
      log.info(`User not authorized to view files for ${courseID}`);
      return false
    } else log.error(err)
  }
};

const hasAccessToFilesAPI = async courseID => {
  let newFileOptions = getUpdatedOptions(`https://${store.get("schoolCode")}.instructure.com/api/v1/courses/${courseID}/files?sort=updated_at&order=desc`);
  try {
    log.info(`requesting: ${newFileOptions.uri}`);
    await request(newFileOptions);
    return true
  } catch(err) {
    if (err === `StatusCodeError: 401 - {"status":"unauthorized","errors":[{"message":"user not authorized to perform that action"}]}`) {
      log.info(`User not authorized to view files for ${courseID}`);
      return false
    } else log.error(err)
  }
};
