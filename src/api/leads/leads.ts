import { api } from "../../common/api";
import { authStore } from "../store/authStore"; // Import your auth store

// Backend endpoints
const MAPPING_SUGGESTIONS_URL = "/leads/mapping-suggestions";
const PROCESS_LEADS_URL = "/leads/process-leads";
const S3_SIGNED_URL_URL = "/campaigns/upload/signed-url";

/**
 * Get a signed URL for uploading files to S3
 */
export const getSignedUrl = async (fileName: string, contentType: string = "text/csv", expiresIn: number = 3600) => {
  try {
    console.log('Requesting signed URL for:', { fileName, contentType, expiresIn });
    
    const response = await api.post(S3_SIGNED_URL_URL, {
      fileName,
      contentType,
      expiresIn
    }, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authStore.getState().accessToken}`,
      },
    });
    
    console.log('Signed URL response:', response.data);
    return response.data;
  } catch (error) {
    console.error("Error getting signed URL:", error);
    
    // Provide more specific error messages
    if (error.response?.status === 401) {
      throw new Error('Authentication failed: Please check your access token');
    } else if (error.response?.status === 403) {
      throw new Error('Access denied: You do not have permission to upload files');
    } else if (error.response?.status === 500) {
      throw new Error('Server error: Failed to generate signed URL');
    }
    
    throw error;
  }
};

/**
 * Upload file directly to S3 using signed URL
 */
export const uploadFileToS3 = async (file: File, signedUrl: string) => {
  try {
    console.log('Uploading file to S3:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      signedUrl: signedUrl.substring(0, 100) + '...' // Log partial URL for debugging
    });

    // Try with minimal headers first
    const response = await fetch(signedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
      mode: 'cors',
    });

    console.log('S3 upload response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('S3 upload failed:', {
        status: response.status,
        statusText: response.statusText,
        errorBody: errorText
      });
      throw new Error(`S3 upload failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response;
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    
    // If CORS error, try alternative approach
    if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
      console.log('CORS error detected, trying alternative upload method...');
      return await uploadFileToS3Alternative(file, signedUrl);
    }
    
    throw error;
  }
};

/**
 * Alternative S3 upload method for CORS issues
 */
export const uploadFileToS3Alternative = async (file: File, signedUrl: string) => {
  try {
    console.log('Trying alternative S3 upload method...');
    
    // Create XMLHttpRequest for better CORS handling
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.open('PUT', signedUrl, true);
      xhr.setRequestHeader('Content-Type', file.type);
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          console.log('Alternative S3 upload successful');
          resolve(xhr);
        } else {
          console.error('Alternative S3 upload failed:', xhr.status, xhr.statusText);
          reject(new Error(`S3 upload failed: ${xhr.status} ${xhr.statusText}`));
        }
      };
      
      xhr.onerror = () => {
        console.error('Alternative S3 upload network error');
        reject(new Error('Network error during S3 upload'));
      };
      
      xhr.send(file);
    });
  } catch (error) {
    console.error("Error in alternative S3 upload:", error);
    throw error;
  }
};

/**
 * Complete S3 upload flow: get signed URL and upload file
 */
export const uploadCSVFile = async (file: File) => {
  try {
    console.log('Starting S3 upload flow for file:', file.name);
    
    // Step 1: Get signed URL
    console.log('Step 1: Getting signed URL...');
    const signedUrlResponse = await getSignedUrl(file.name, file.type);
    const responseData = signedUrlResponse as any;
    
    if (!responseData.data) {
      throw new Error('Invalid response from signed URL endpoint');
    }
    
    const { signedUrl, fileKey, publicUrl } = responseData.data;
    
    if (!signedUrl || !fileKey || !publicUrl) {
      throw new Error('Missing required fields in signed URL response');
    }
    
    console.log('Step 2: Uploading file to S3...');
    // Step 2: Upload file to S3
    await uploadFileToS3(file, signedUrl);
    
    console.log('Step 3: Upload completed successfully');
    // Step 3: Return the file information
    return {
      data: {
        fileName: file.name,
        s3Url: publicUrl,
        fileKey: fileKey,
        file: file
      }
    };
  } catch (error) {
    console.error("Error in complete S3 upload flow:", error);
    
    // Provide more specific error messages
    if (error.message.includes('CORS')) {
      throw new Error('CORS error: Please check S3 bucket CORS configuration');
    } else if (error.message.includes('403')) {
      throw new Error('Access denied: Please check S3 bucket permissions and signed URL validity');
    } else if (error.message.includes('404')) {
      throw new Error('S3 endpoint not found: Please check the signed URL');
    }
    
    throw error;
  }
};

/**
 * Upload a CSV file to backend to get mapping suggestions
 */
export const getMappingSuggestions = async (file: File) => {
  const formData = new FormData();
  formData.append("csv_file", file);

  try {
    return await api.post(MAPPING_SUGGESTIONS_URL, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        "Authorization": `Bearer ${authStore.getState().accessToken}`,
      },
    });
  } catch (error) {
    console.error("Error getting mapping suggestions:", error);
    throw error;
  }
};

/**
 * Process leads with mapping + filtered data.
 * ✅ This now sends JSON instead of FormData
 * Updated to accept the filteredData parameter
 */
export const processLeadsWithMapping = async (
  mappingInfo: any,
  filteredData?: any[],
) => {
  const payload = {
    mappings: mappingInfo,
    filteredData: filteredData || [],
  };

  return api.post(PROCESS_LEADS_URL, payload, {
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${authStore.getState().accessToken}`,
    },
  });
};

/**
 * Universal handler for serverless API (proxy-style)
 */
export async function handler(req, res) {
  try {
    const method = req.method;
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathParts = url.pathname.split("/").filter(Boolean);

    if (method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res
        .status(401)
        .json({ error: "Unauthorized - Missing authentication token" });
    }

    const isMappingSuggestions = pathParts.includes("mapping-suggestions");
    const isProcessLeads = pathParts.includes("process-leads");

    if (isMappingSuggestions) {
      // Forward FormData (file upload) to backend
      const response = await api.post(MAPPING_SUGGESTIONS_URL, req.body, {
        headers: { Authorization: authHeader },
      });
      return res.status(response.status).json(response.data);
    } else if (isProcessLeads) {
      // Handle process leads request - support both JSON and FormData
      if (req.body.mappings && typeof req.body.mappings === 'object') {
        // JSON payload approach (HEAD)
        const response = await api.post(PROCESS_LEADS_URL, req.body, {
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
        });
        return res.status(response.status).json(response.data);
      } else {
        // FormData approach (refactored branch)
        if (!req.files || !req.files.csv_file) {
          return res.status(400).json({ error: "Missing CSV file" });
        }
        
        const file = req.files.csv_file;
        
        // Require mapping information for all uploads
        if (!req.body.mappings) {
          return res.status(400).json({ error: "Missing mappings information" });
        }
        
        const mappingInfo = JSON.parse(req.body.mappings);
        
        // Check for optional filteredData in the request body
        const filteredData = req.body.filteredData ? JSON.parse(req.body.filteredData) : undefined;
        
        const response = await processLeadsWithMapping(mappingInfo, filteredData);
        return res.status(200).json(response.data);
      }
    } else {
      return res.status(404).json({ error: "Endpoint not found" });
    }
  } catch (error) {
    console.error("Leads API error:", error);
    return res
      .status(500)
      .json({ error: error.message || "Internal server error" });
  }
}
