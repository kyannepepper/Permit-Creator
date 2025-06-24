# External App Insurance Document Integration Guide

## Overview

The insurance documents are stored directly in the PostgreSQL database as base64 encoded strings. This solution bypasses the API endpoints and provides direct database access for reliable document retrieval.

## Database Schema

Insurance documents are stored in the `applications` table in the `insurance` JSON field with this structure:

```json
{
  "carrier": "Insurance Company Name",
  "required": true,
  "phoneNumber": "Contact Number",
  "documentUploaded": true,
  "documentBase64": "base64_encoded_file_data_here",
  "documentFilename": "original_filename.pdf",
  "documentOriginalName": "user_friendly_name.pdf", 
  "documentSize": 150000,
  "documentMimeType": "application/pdf",
  "documentUploadedAt": "2025-06-24T10:30:00.000Z",
  "submittedAt": "2025-06-24T10:30:00.000Z"
}
```

## SQL Queries

### Get All Applications with Insurance Documents

```sql
SELECT 
  id as application_id,
  application_number,
  first_name || ' ' || last_name as applicant_name,
  email,
  phone,
  insurance->>'documentOriginalName' as filename,
  insurance->>'documentMimeType' as mime_type,
  insurance->>'documentBase64' as document_data
FROM applications 
WHERE insurance->>'documentUploaded' = 'true'
AND insurance->>'documentBase64' IS NOT NULL
ORDER BY created_at DESC;
```

### Get Specific Application Insurance Document

```sql
SELECT 
  insurance->>'documentBase64' as document_data,
  insurance->>'documentOriginalName' as filename,
  insurance->>'documentMimeType' as mime_type
FROM applications 
WHERE id = $1 
AND insurance->>'documentUploaded' = 'true'
AND insurance->>'documentBase64' IS NOT NULL;
```

## Node.js Implementation

### Database Connection Setup

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
```

### Extract and Save Insurance Document

```javascript
const fs = require('fs');
const path = require('path');

async function saveInsuranceDocument(applicationId, outputPath = './downloads') {
  try {
    const result = await pool.query(`
      SELECT 
        insurance->>'documentBase64' as document_data,
        insurance->>'documentOriginalName' as filename,
        insurance->>'documentMimeType' as mime_type
      FROM applications 
      WHERE id = $1 
      AND insurance->>'documentUploaded' = 'true'
      AND insurance->>'documentBase64' IS NOT NULL
    `, [applicationId]);
    
    if (result.rows.length === 0) {
      console.log(`No insurance document found for application ${applicationId}`);
      return null;
    }
    
    const { 
      document_data, 
      filename,
      mime_type 
    } = result.rows[0];
    
    // Ensure output directory exists
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }
    
    // Convert base64 to file buffer
    const fileBuffer = Buffer.from(document_data, 'base64');
    
    // Save file
    const filePath = path.join(outputPath, filename);
    fs.writeFileSync(filePath, fileBuffer);
    
    console.log(`Insurance document saved: ${filePath}`);
    console.log(`File size: ${fileBuffer.length} bytes`);
    console.log(`MIME type: ${mime_type}`);
    
    return {
      filename: filename,
      path: filePath,
      size: fileBuffer.length,
      mimeType: mime_type
    };
    
  } catch (error) {
    console.error(`Error saving insurance document for application ${applicationId}:`, error);
    return null;
  }
}
```

### Get All Insurance Documents

```javascript
async function getAllInsuranceDocuments() {
  try {
    const result = await pool.query(`
      SELECT 
        id as application_id,
        application_number,
        first_name || ' ' || last_name as applicant_name,
        email,
        phone,
        insurance_document_filename,
        insurance_document_mime_type,
        LENGTH(insurance_document_data) as document_size_bytes,
        created_at
      FROM applications 
      WHERE insurance_document_data IS NOT NULL 
      ORDER BY created_at DESC
    `);
    
    return result.rows;
  } catch (error) {
    console.error('Error fetching insurance documents:', error);
    return [];
  }
}
```

### Serve Insurance Document via Express

```javascript
const express = require('express');
const app = express();

app.get('/insurance/:applicationId', async (req, res) => {
  try {
    const applicationId = parseInt(req.params.applicationId);
    
    const result = await pool.query(`
      SELECT 
        insurance_document_data, 
        insurance_document_filename,
        insurance_document_mime_type
      FROM applications 
      WHERE id = $1 AND insurance_document_data IS NOT NULL
    `, [applicationId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Insurance document not found' });
    }
    
    const { 
      insurance_document_data, 
      insurance_document_filename,
      insurance_document_mime_type 
    } = result.rows[0];
    
    // Convert base64 to buffer
    const fileBuffer = Buffer.from(insurance_document_data, 'base64');
    
    // Set appropriate headers
    res.setHeader('Content-Type', insurance_document_mime_type);
    res.setHeader('Content-Length', fileBuffer.length);
    res.setHeader('Content-Disposition', `inline; filename="${insurance_document_filename}"`);
    
    // Send the file
    res.send(fileBuffer);
    
  } catch (error) {
    console.error('Error serving insurance document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

## Current Working Applications

Based on the database, these applications have insurance documents available:

- **Application 40** (UP1846836): Kody Pig - cd12e42e511337f65f78478f8a24fb3c.jpg (90,760 bytes)
- **Application 43** (UP1659494): Kyanne Klein - Screenshot 2025-05-12 at 2.48.57â¯PM.png (3,938 bytes)

Note: Application 42 (UP8353783) shows `documentUploaded: false` so no document is available.

## Example Usage

```javascript
// Save a specific insurance document
const result = await saveInsuranceDocument(40, './insurance_docs');
if (result) {
  console.log(`Document saved: ${result.filename}`);
}

// Get all applications with insurance documents
const applications = await getAllInsuranceDocuments();
console.log(`Found ${applications.length} applications with insurance documents`);

// Process all insurance documents
for (const app of applications) {
  const result = await saveInsuranceDocument(app.application_id, './all_insurance_docs');
  if (result) {
    console.log(`Processed ${app.applicant_name}: ${result.filename}`);
  }
}
```

## Error Handling

Always handle potential errors:

```javascript
async function safeGetInsuranceDocument(applicationId) {
  try {
    return await saveInsuranceDocument(applicationId);
  } catch (error) {
    console.error(`Failed to process application ${applicationId}:`, error.message);
    return null;
  }
}
```

## Security Considerations

1. **Database Access**: Ensure your external app has appropriate database permissions
2. **File Validation**: Validate file types and sizes before processing
3. **Path Security**: Use `path.join()` to prevent directory traversal attacks
4. **Error Logging**: Log errors but don't expose internal details to clients

## Troubleshooting

- **Empty Results**: Check that `insurance_document_data IS NOT NULL` in your queries
- **Invalid Base64**: Ensure the base64 data is properly formatted
- **File Corruption**: Verify the original upload was successful
- **Memory Issues**: For large files, consider streaming instead of loading entire buffers

This solution provides reliable access to insurance documents stored in the database, bypassing any API endpoint issues.