const express = require('express');
const aws = require('aws-sdk');
const axios = require('axios');
const mime = require('mime-types');
const router = express.Router();
const fs = require('fs')
const sharp = require('sharp');
const checkRedis = require('./redis')

// S3 setup
const bucketName = "naoki-img";
const s3 = new aws.S3({
  apiVersion: "2006-03-01",
  region: "ap-southeast-2"
});

(async () => {
  try {
    console.log("Creating bucket...");
    await s3.createBucket({ Bucket: bucketName }).promise();
    console.log(`Create bucket: ${bucketName}`);
  } catch (err) {
    if (err.statusCode !== 409) {
      console.log(`Error creating bucket: ${bucketName}`, err.stack);
    } else {
      console.log(`Bucket ${bucketName} already exists!`);
    }
  }
})();

router.get("/", async (req, res, next) => {
  const image = req.query.name;

  console.log(image);
});

router.post('/store', async (req, res, next) => {
  //const image = req.query.name;
  const uploadedimage = req.files["file0"];
  const s3Key = uploadedimage.md5;
  console.log(s3Key);

  let redischeck = await checkRedis(s3Key);
  console.log("redischeck: ",redischeck);

  //console.log("path1", uploadedimage);

  // let path1 = req.files["file0"];

  console.log("------------"); 
  if(!redischeck){ 
  //image resizing
  const image = sharp(uploadedimage.data); 
  image
    .resize({
      width: 200, 
      height: 200,
      fit: "contain",
      position: "left",
    }).toBuffer().then((data) => {
      console.log("Resized image: ", data);
      asyncCall(data);
      //return res.send(s3Result.Body.toString("base64"));
    });
  }else{
    const params = { Bucket: bucketName, Key: s3Key };
    const s3Result = await s3.getObject(params).promise();
    //console.log("s3Result: ", s3Result.Body.toString("base64"));
    console.log("contenttype: ", s3Result.ContentType);
    return res.send(s3Result.Body.toString("base64"));
  }
  //console.log("uploadedimage: ", uploadedimage);
  //console.log("Resized image: ", image);

  console.log("---------------");

  // const image1 = fs.readFileSync(path1, function (err, data) {
  //   fs.writeFileSync('image1', data);
  // });

  const mimeType = uploadedimage.mimetype;
  //console.log("mimeType: ", mimeType);


  //console.log("url", urlParams);

  // (async () => {
  //   try {
  //     console.log("image desuyo", image);
  //     await s3.putObject(urlParams).promise();
  //     console.log(`Successfully uploaded data to ${bucketName}/${s3Key}`);
  //   } catch (err) {
  //     console.log(err, err.stack);
  //   }
  // })();

  async function asyncCall(data) {
    try {
      const urlParams = {
        Bucket: bucketName,
        Key:s3Key,
        Expires: 600,
        ContentType: mimeType,
        Body: data
      };
      console.log("image desuyo", data);
      await s3.putObject(urlParams).promise();
      console.log(`Successfully uploaded data to ${bucketName}/${s3Key}`);
    } catch (err) {
      console.log(err, err.stack);
    }
  };

  //   try {
  //     console.log("-------------");
  //     // const s3Result = await s3.getObject(urlParams).promise();
  //     // Serve from S3
  //     //const s3JSON = JSON.parse(s3Result.Body);
  //     //res.json(s3JSON);
  // } catch (err) {
  //   console.log("AAAAAAAAA");
  //     if (err.statusCode === 404) {
  //         // Serve from Wikipedia API and store in S3
  //         response = await axios.get(urlParams);
  //         const responseJSON = response.data;
  //         const body = JSON.stringify({
  //             source: "S3 Bucket",
  //             ...responseJSON,
  //         });
  //         const objectParams = { Bucket: bucketName, Key: hash, Body: body };
  //         await s3.putObject(objectParams).promise();
  //         console.log(`Successfully uploaded data to ${bucketName}/${req.files["file0"].md5}`);
  //         res.json({ source: "Resized imgae successfully uploaded", ...responseJSON });
  //     } else {
  //         // Something else went wrong when accessing S3
  //         res.json(err);
  //     }
  // }


  // try {
  //   console.log(`Generation pre-signed URL for image ${image}...`);
  //   const presignedUrl = s3.getSignedUrl('putObject', urlParams);
  //   console.log(`Presigned URL for ${image} generated!`);
  //   res.json({ s3Url: presignedUrl });
  // } catch (err) {
  //   if (err.statusCode === 404) {
  //     // Serve from Wikipedia API and store in S3
  //     //response = await axios.get(searchUrl);
  //     //const responseJSON = response.data;
  //     const body = JSON.stringify({
  //       source: "S3 Bucket",
  //       ...responseJSON,
  //     });

  //     const objectParams = {
  //       Bucket: bucketName,
  //       Key: hash,
  //       Expires: 600,
  //       ContentType: mimeType,
  //       Body: image1
  //     };

  //     //const objectParams = { Bucket: bucketName, Key: s3Key, Body: body };
  //     await s3.putObject(objectParams).promise();
  //     console.log(`Successfully uploaded data to ${bucketName}/${hash}`);
  //     res.json({ source: "img", ...responseJSON });
  //   } else {
  //     // Something else went wrong when accessing S3
  //     res.json(err);
  //   }
  // }
});

module.exports = router;