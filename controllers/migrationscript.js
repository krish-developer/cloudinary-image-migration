const fs = require('fs');
const path = require('path');
const axios = require('axios');
const File = require("../models/File");
const cloudinary = require("cloudinary").v2;



const uploadFileToCloudinary = async (filePath, folder, quality) => {
  const options = { folder };
  if (quality) options.quality = quality;
  options.resource_type = "auto";
  return await cloudinary.uploader.upload(filePath, options);
};

const downloadFile = async (url, localPath) => {
  const writer = fs.createWriteStream(localPath);
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
  });
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(localPath));
    writer.on('error', reject);
  });
};

const processLocalFiles = async (folderPath, cloudinaryFolder) => {
  try {
    const files = fs.readdirSync(folderPath);
    const supportedTypes = ["jpg", "jpeg", "png", "mp4", "mov"];

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const fileType = file.split('.').pop().toLowerCase();

      if (!supportedTypes.includes(fileType)) {
        console.log(`Skipping unsupported file type: ${file}`);
        continue;
      }

      try {
        console.log(`Uploading ${file} from local folder to Cloudinary...`);
        const response = await uploadFileToCloudinary(filePath, cloudinaryFolder);
        
        // Save to database
        await File.create({
          name: file,
          imageUrl: response.secure_url,
        });

        console.log(`Successfully uploaded ${file}`);
      } catch (uploadError) {
        console.error(`Error uploading ${file}:`, uploadError);
      }
    }

    console.log('Local files processed.');
  } catch (error) {
    console.error('Error processing local folder:', error);
  }
};

const processOnlineFiles = async (urls, cloudinaryFolder) => {
  try {
    for (const url of urls) {
      const fileName = path.basename(url);
      const localFilePath = path.join(__dirname, 'temp', fileName); // Temporary local path
      const fileType = fileName.split('.').pop().toLowerCase();

      const supportedTypes = ["jpg", "jpeg", "png", "mp4", "mov"];
      if (!supportedTypes.includes(fileType)) {
        console.log(`Skipping unsupported file type: ${fileName}`);
        continue;
      }

      try {
        console.log(`Downloading ${fileName} from ${url}...`);
        await downloadFile(url, localFilePath);

        console.log(`Uploading ${fileName} to Cloudinary...`);
        const response = await uploadFileToCloudinary(localFilePath, cloudinaryFolder);
        
        // Save to database
        await File.create({
          name: fileName,
          imageUrl: response.secure_url,
        });

        console.log(`Successfully uploaded ${fileName}`);
        
        // Clean up temporary file
        fs.unlinkSync(localFilePath);
      } catch (uploadError) {
        console.error(`Error uploading ${fileName}:`, uploadError);
      }
    }

    console.log('Online files processed.');
  } catch (error) {
    console.error('Error processing URLs:', error);
  }
};

const localFolderPath = path.join(__dirname, 'files'); 
const onlineFileUrls = [
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT_kUAGbXT8z10jgWMq33BGCK0DzlVPvP9aFg&s',
];
const cloudinaryFolder = 'file'; // Cloudinary folder

// Process local files
//processLocalFiles(localFolderPath, cloudinaryFolder);

// Process online files
//processOnlineFiles(onlineFileUrls, cloudinaryFolder);
