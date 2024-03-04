import AWS from 'aws-sdk';
import { idFromFilename } from '../helpers';
import {
    FormConfiguration
} from "./configurationService";

const s3 = new AWS.S3({
    s3ForcePathStyle: true,
    endpoint: "http://localhost:4566",
    credentials: {
        accessKeyId: "112233445566",
        secretAccessKey: "LSIAQAAAAAAVNCBMPNSG"
    }
});

/**
 * Loads FormConfigurations from JSON files stored in an S3 bucket.
 * @param {string} bucketName - The name of the S3 bucket.
 * @param {string} prefix - The prefix for the JSON files in the bucket.
 * @returns {Promise<{loaded: FormConfiguration[], failed: string[]}>} - A Promise that resolves to an object containing loaded FormConfigurations and failed file keys.
 */
async function loadFormConfigurationsFromS3(bucketName) {
    const params = {
        Bucket: bucketName
    };

    try {
        const data = await s3.listObjectsV2(params).promise();

        // Filter out only JSON files
        const jsonFiles = data.Contents.filter(obj => obj.Key.endsWith('.json'));

        // Track loaded and failed files
        /** @type {FormConfiguration} */
        const loadedForms = [];
        const failedForms = [];

        // Fetch each JSON file and parse it into FormConfiguration objects
        await Promise.allSettled(jsonFiles.map(async obj => {
            const fileParams = {
                Bucket: bucketName,
                Key: obj.Key
            };

            try {
                console.log("HIT");
                console.log(`Loading form: ${obj.Key}`);
                
                const fileData = await s3.getObject(fileParams).promise();
                const jsonContent = JSON.parse(fileData.Body.toString());

                // Map JSON content to FormConfiguration instances
                loadedForms.push({
                    id: idFromFilename(obj.Key),
                    configuration: jsonContent
                });
            } catch (error) {
                console.error(`Failed to load ${obj.Key}:`, error);
                failedForms.push(obj.Key);
            }
        }));

        return { loaded: loadedForms, failed: failedForms };
    } catch (error) {
        console.error("Error loading FormConfigurations from S3:", error);
        throw error;
    }
}

async function initiateLoad() {
    const bucketName = 'sample-bucket';
    
    return await loadFormConfigurationsFromS3(bucketName)
}

export {
    initiateLoad
}