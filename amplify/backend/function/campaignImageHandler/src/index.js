// amplify/backend/function/campaignImageHandler/src/index.js

/* Amplify Params - DO NOT EDIT
  ENV
  REGION
  API_WORLDFUNDAPI_APINAME
  API_WORLDFUNDAPI_APIID
  PROCESSED_IMAGE_S3_PREFIX 
Amplify Params - DO NOT EDIT */

// Import AWS SDK v3 S3 Client
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import sharp from 'sharp'; // For image processing
// file-type is an ES module, so we'll use dynamic import.
// Ensure your Lambda Node.js runtime supports this (Node.js 14.x or higher usually does).

const s3Client = new S3Client({ region: process.env.REGION });

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png']; // Only JPEG and PNG
const MAX_WIDTH = 1200;  // Max width for resized images
const MAX_HEIGHT = 800;  // Max height for resized images
const IMAGE_QUALITY = 80; // Quality for JPEG/PNG output

/**
 * @type {import('@types/aws-lambda').S3Handler}
 */
exports.handler = async (event) => {
  console.log(`EVENT: ${JSON.stringify(event)}`);

  // Get the S3 bucket and object key from the event
  const record = event.Records && event.Records[0];
  if (!record || !record.s3) {
    console.error("Invalid S3 event structure. Exiting.");
    // For S3 triggers, you don't typically return an HTTP response.
    // Errors can be thrown, or you can log and exit.
    return; 
  }

  const sourceBucket = record.s3.bucket.name;
  // Object key may have spaces or special characters, S3 URL decodes them.
  const sourceKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

  // Prevent infinite loops if this Lambda also writes to the same bucket/prefix it's triggered by
  // Ensure PROCESSED_IMAGE_S3_PREFIX is different from the trigger prefix
  if (sourceKey.startsWith(process.env.PROCESSED_IMAGE_S3_PREFIX)) {
    console.log("This is already a processed image, skipping.");
    return;
  }
  // Also, ensure sourceKey is from the expected raw upload path, e.g., within 'protected/' or 'raw-campaign-uploads/'
  // Example: if raw uploads are to 'protected/{identity_id}/raw-campaign-uploads/filename.ext'
  // And your S3 trigger prefix is 'protected/'
  if (!sourceKey.includes('/raw-campaign-uploads/')) { // Adjust this check to your raw upload path structure
      console.log(`Skipping file not in a raw upload path: ${sourceKey}`);
      return;
  }


  console.log(`Processing ${sourceKey} from bucket ${sourceBucket}`);

  try {
    // 1. Fetch the raw image from S3
    const getObjectParams = { Bucket: sourceBucket, Key: sourceKey };
    const s3Object = await s3Client.send(new GetObjectCommand(getObjectParams));
    
    if (!s3Object.Body) {
        throw new Error(`S3 Object body is empty for ${sourceKey}`);
    }
    // SDK v3: s3Object.Body is a readable stream. Convert to buffer.
    const imageBuffer = Buffer.from(await s3Object.Body.transformToByteArray());
    console.log(`Workspaceed raw image, size: ${imageBuffer.length} bytes`);

    // 2. Verify True File Type
    const { fileTypeFromBuffer } = await import('file-type'); // Dynamic import
    const typeResult = await fileTypeFromBuffer(imageBuffer);

    if (!typeResult || !ALLOWED_MIME_TYPES.includes(typeResult.mime)) {
      const detectedType = typeResult ? typeResult.mime : 'unknown';
      console.error(`Invalid file type: ${detectedType} for ${sourceKey}. Deleting raw file.`);
      await s3Client.send(new DeleteObjectCommand(getObjectParams));
      // TODO: Optionally, notify your system or admin about the rejection
      return { status: 'rejected', reason: `Invalid file type: ${detectedType}` };
    }
    console.log(`Verified file type: ${typeResult.mime}`);

    // 3. Sanitize/Re-process and Optimize with Sharp
    let processedImageBuffer;
    let newMimeType = typeResult.mime;
    let newExtension = typeResult.ext;

    const imageSharp = sharp(imageBuffer);
    
    const resizedImage = imageSharp.resize({
      width: MAX_WIDTH,
      height: MAX_HEIGHT,
      fit: sharp.fit.inside, 
      withoutEnlargement: true, 
    });

    if (typeResult.mime === 'image/jpeg') {
      processedImageBuffer = await resizedImage.jpeg({ quality: IMAGE_QUALITY }).toBuffer();
    } else if (typeResult.mime === 'image/png') {
      processedImageBuffer = await resizedImage.png({ quality: IMAGE_QUALITY }).toBuffer();
    } else {
      // This case should ideally not be reached if ALLOWED_MIME_TYPES is enforced
      console.error(`Cannot process unsupported (but somehow allowed) type: ${typeResult.mime}. Deleting raw file.`);
      await s3Client.send(new DeleteObjectCommand(getObjectParams));
      return { status: 'rejected', reason: 'Cannot process type' };
    }
    console.log(`Image processed with Sharp. New size: ${processedImageBuffer.length} bytes`);

    // 4. Store Processed Image in S3 (public location)
    const originalFileName = sourceKey.substring(sourceKey.lastIndexOf('/') + 1);
    const baseName = originalFileName.substring(0, originalFileName.lastIndexOf('.')) || `campaign-image-${Date.now()}`;
    const processedImageKey = `${process.env.PROCESSED_IMAGE_S3_PREFIX}${baseName}.${newExtension}`;

    const putObjectParams = {
      Bucket: sourceBucket, // Or a different bucket if desired
      Key: processedObjectKey,
      Body: processedImageBuffer,
      ContentType: newMimeType,
      ACL: 'public-read', // Make the processed image publicly readable
    };
    await s3Client.send(new PutObjectCommand(putObjectParams));
    console.log(`Processed image stored at s3://${sourceBucket}/${processedObjectKey}`);
    
    // Construct the public URL (standard S3 path-style URL)
    const publicImageUrl = `https://${sourceBucket}.s3.${process.env.REGION}.amazonaws.com/${processedObjectKey}`;
    // If you set up CloudFront, you'd use your CloudFront domain here instead.

    // 5. Update Database with the publicImageUrl for the PROCESSED image
    //    This is a CRITICAL step you need to implement.
    //    You need a way to link this processed image back to the correct campaign.
    //    - Option 1: The 'sourceKey' might contain the campaignId or a unique identifier
    //      that was included when the file was uploaded from CreateCampaignForm.tsx.
    //      e.g., sourceKey was 'raw-campaign-uploads/campaignId_or_tempId/filename.jpg'
    //    - Option 2: S3 object metadata. When uploading from CreateCampaignForm, you could add
    //      custom metadata (x-amz-meta-campaign-id: 'your-campaign-id'). This metadata is
    //      available in the S3 event record and can be read by the Lambda.
    //    - Option 3: If the campaign is created, then image uploaded, the CreateCampaignForm.tsx
    //      could call a backend mutation to associate the raw `s3ImageKey` with the `campaignId`.
    //      This Lambda then finds the campaign by this raw `s3ImageKey` and updates it with the new `publicImageUrl`.

    // Example (conceptual - replace with your actual DB update logic):
    // const campaignId = extractCampaignIdFromKeyOrMetadata(sourceKey, record.s3.object.metadata);
    // if (campaignId) {
    //   await updateCampaignInDatabase(campaignId, { imageUrl: publicImageUrl, imageS3Key: processedObjectKey });
    //   console.log(`Database updated for campaign ${campaignId} with image URL: ${publicImageUrl}`);
    // } else {
    //   console.error("Could not determine campaignId to update database for processed image:", sourceKey);
    //   // Potentially delete the processed image if we can't link it, to avoid orphaned files.
    //   await s3Client.send(new DeleteObjectCommand({ Bucket: sourceBucket, Key: processedObjectKey }));
    //   throw new Error("Failed to link processed image to a campaign.");
    // }
    console.log("TODO: Implement database update with URL:", publicImageUrl);


    // 6. Cleanup: Delete the original raw image from S3
    await s3Client.send(new DeleteObjectCommand(getObjectParams));
    console.log(`Original raw file ${sourceKey} deleted successfully.`);

    const processedObjectKey = `${process.env.PROCESSED_IMAGE_S3_PREFIX}${baseName}.${newExtension}`;

  } catch (error) {
    console.error("Error processing S3 image:", error);
    // Depending on the error, you might not want to delete the sourceKey,
    // or you might move it to an 'error' prefix for investigation.
    throw error; // Re-throw to mark Lambda execution as failed for CloudWatch monitoring & retries
  }
};

// // --- Placeholder for your database update logic ---
// async function updateCampaignInDatabase(campaignId, { imageUrl, imageS3Key }) {
//   // This function would use AWS SDK for DynamoDB or make a GraphQL call via AppSync
//   // to update the campaign item with the new image URL and/or processed S3 key.
//   // Example using AppSync (if Lambda has permissions):
//   /*
//   const { HttpRequest } = await import("@aws-sdk/protocol-http");
//   const { defaultProvider } = await import("@aws-sdk/credential-provider-node");
//   const { SignatureV4 } = await import("@aws-sdk/signature-v4");
//   const { Sha256 } = await import("@aws-crypto/sha256-js");
//   const fetch = (await import('node-fetch')).default; // Requires node-fetch v2 for CJS

//   const mutation = {
//     query: `
//       mutation UpdateCampaignImage($input: UpdateCampaignInput!) {
//         updateCampaign(input: $input) {
//           id
//           image
//         }
//       }
//     `,
//     variables: {
//       input: {
//         id: campaignId,
//         image: imageUrl,
//         // imageS3Key: imageS3Key, // if you also store the processed key
//       }
//     }
//   };

//   const endpoint = new URL(process.env.API_WORLDFUNDAPI_GRAPHQLAPIENDPOINTOUTPUT); // This env var should be available
//   const signer = new SignatureV4({
//     credentials: defaultProvider(),
//     region: process.env.REGION,
//     service: 'appsync',
//     sha256: Sha256
//   });

//   const requestToBeSigned = new HttpRequest({
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       host: endpoint.host
//     },
//     hostname: endpoint.host,
//     body: JSON.stringify(mutation),
//     path: endpoint.pathname
//   });

//   const signed = await signer.sign(requestToBeSigned);
//   const response = await fetch(endpoint, signed);
//   const responseBody = await response.json();
//   if (responseBody.errors) {
//     throw new Error(JSON.stringify(responseBody.errors));
//   }
//   */
//   console.log(`Placeholder: DB updated for ${campaignId} with ${imageUrl}`);
// }

// // Placeholder to extract campaign identifier (you'll need a robust way to do this)
// function extractCampaignIdFromKeyOrMetadata(s3Key, metadata) {
//   if (metadata && metadata['campaign-id']) { // Check for x-amz-meta-campaign-id
//       return metadata['campaign-id'];
//   }
//   // Example: if raw key was like "raw-campaign-uploads/USER_ID/CAMPAIGN_ID_OR_TEMP_ID/filename.jpg"
//   // const parts = s3Key.split('/');
//   // if (parts.length >= 4 && parts[parts.length-2] !== 'raw-campaign-uploads') { // crude check
//   //     return parts[parts.length-2];
//   // }
//   return null;
// }