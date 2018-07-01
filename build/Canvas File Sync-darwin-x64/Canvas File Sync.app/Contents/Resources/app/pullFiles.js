// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const fs = require('fs')
const request = require("request-promise");
let filesMap = require('./filesMap.json')

rootDir = __dirname
console.log("i'm here")

  let headers = {"Authorization": "Bearer 1012~awsQawxSjvyEa90bL5Vzh3cDrao7lYzRzlBaFH1bl9UEddpKpH5QRb7MgyIv9iGF"};

  const options = {
    method: "GET",
    uri: "https://uvu.instructure.com/api/v1/users/self/courses?enrollment_state=active",
    headers: headers,
    json: true,
    encoding: null
  };

  const getCanvasFiles = async () => {
    let rootResponse = await request(options)
    for (let course of rootResponse) {
      console.log("looping through courses")

      if (!fs.existsSync(course.name)){
        fs.mkdirSync(course.name);
      }

      if (!(await hasCourse(course.name))) {
        filesMap.courses.push(
          {
            "name": course.name,
            "last_updated": Date.now(),
            "folders": []
          }
        )
      }

      console.log(filesMap)
      
      getFolderData(course.name, "https://uvu.instructure.com/api/v1/courses/" + course.id + "/folders")
    }
  }

  const hasCourse = async (courseName) => {
    for (let course of filesMap.courses) {
      if (course.name === courseName) {
        return true
      }
    }
    return false;
  }

  const getFolderData = async (folderPath, folderURL) => {
    console.log(folderURL)
    folderOptions = options
    folderOptions.uri = folderURL
    let folderResponse = await request(folderOptions)    
    for (let folder of folderResponse) {
      
      //course files folder is technically the root folder
      let currentFolderPath = ""
      if (folder.name !== "course files") {
        currentFolderPath = `${folderPath}/${folder.name}`
      }
      else {
        currentFolderPath = folderPath
      }

      //create folder if it doesn't exist
      if (!fs.existsSync(currentFolderPath)){
        fs.mkdirSync(currentFolderPath);
      }
      if (folder.folders_count !== 0 && folder.name !== "course files") {
        getFolderData(currentFolderPath,folder.folders_url)
      }

      getFileData(currentFolderPath, folder.files_url)
      
    }
  }

  const getFileData = async (path, url, page=1) => {
    let fileOptions = options
    fileOptions.uri = url
    let filesResponse = await request(fileOptions)
    console.log(`${filesResponse.length} ${url}`)
    if(filesResponse.length === 10) {
      console.log("in here")
      // console.log(folder.files_url)
      // console.log(options.uri)
      // console.log(options)
      // const newPageFileResponse = await request(newFilesOptions)
      // console.log(newPageFileResponse)
      await getFileData(path, `${url}?page=${page + 1}`, page + 1)
    }

    for (let file of filesResponse) {
      let fileDownloadOptions = options
      fileDownloadOptions.uri = file.url
      let filePath = `${path}/${file.display_name}`
      // console.log(file.url)
      await request.get(fileDownloadOptions)
        .then(function (res) {
          const buffer = Buffer.from(res, 'utf8');
          fs.writeFileSync(filePath, buffer);
        });
      console.log("wrote file")
    }
    return
  }

  getCanvasFiles()