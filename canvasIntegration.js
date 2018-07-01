const fs = require("fs");
const request = require("request-promise");
let filesMap = require("./filesMap.json");

let headers = {};

const options = {
  method: "GET",
  uri:
    "https://uvu.instructure.com/api/v1/users/self/courses?enrollment_state=active",
  headers: headers,
  json: true,
  encoding: null
};

const getCanvasCourses = (exports.getCanvasCourses = async developerKey => {
  try {
    canvasHeaders = { Authorization: `Bearer ${developerKey}` };
    options.headers = canvasHeaders;
    let rootResponse = await request(options);
    console.log(rootResponse);
    return { success: true, message: "success", response: rootResponse };
  } catch (error) {
    console.log(error);
    if (
      error.message === '401 - {"errors":[{"message":"Invalid access token."}]}'
    ) {
      return { success: false, message: "Invalid Developer Key" };
    }
    return { success: false, message: error.message };
  }
});

const getCanvasFiles = (exports.getCanvasFiles = async (courses, rootDir) => {
  for (let course of courses) {
    console.log("looping through courses");

    if (!fs.existsSync(`${rootDir}/${course.name}`)) {
      fs.mkdirSync(`${rootDir}/${course.name}`);
    }

    if (!(await hasCourse(course.name))) {
      filesMap.courses.push({
        name: course.name,
        last_updated: Date.now(),
        folders: []
      });
    }

    console.log(filesMap);

    getFolderData(
      `${rootDir}/${course.name}`,
      "https://uvu.instructure.com/api/v1/courses/" + course.id + "/folders"
    );
  }
});

const hasCourse = async courseName => {
  for (let course of filesMap.courses) {
    if (course.name === courseName) {
      return true;
    }
  }
  return false;
};

const getFolderData = async (folderPath, folderURL) => {
  console.log(folderURL);
  folderOptions = options;
  folderOptions.uri = folderURL;
  let folderResponse = await request(folderOptions);
  for (let folder of folderResponse) {
    //course files folder is technically the root folder
    let currentFolderPath = "";
    if (folder.name !== "course files") {
      currentFolderPath = `${folderPath}/${folder.name}`;
    } else {
      currentFolderPath = folderPath;
    }

    //create folder if it doesn't exist
    if (!fs.existsSync(currentFolderPath)) {
      fs.mkdirSync(currentFolderPath);
    }
    if (folder.folders_count !== 0 && folder.name !== "course files") {
      getFolderData(currentFolderPath, folder.folders_url);
    }

    getFileData(currentFolderPath, folder.files_url);
  }
};

const getFileData = async (path, url, page = 1) => {
  let fileOptions = options;
  fileOptions.uri = url;
  let filesResponse = await request(fileOptions);
  console.log(`${filesResponse.length} ${url}`);
  if (filesResponse.length === 10) {
    console.log("in here");
    // console.log(folder.files_url)
    // console.log(options.uri)
    // console.log(options)
    // const newPageFileResponse = await request(newFilesOptions)
    // console.log(newPageFileResponse)
    await getFileData(path, `${url}?page=${page + 1}`, page + 1);
  }

  for (let file of filesResponse) {
    let fileDownloadOptions = options;
    fileDownloadOptions.uri = file.url;
    let filePath = `${path}/${file.display_name}`;
    // console.log(file.url)
    await request.get(fileDownloadOptions).then(function(res) {
      console.log("Found file");
      const buffer = Buffer.from(res, "utf8");
      fs.writeFileSync(filePath, buffer);
    });
    console.log("wrote file");
  }
  return;
};
