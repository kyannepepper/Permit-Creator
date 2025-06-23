// Temporary script to map uploaded files to insurance documents
const fs = require('fs');
const path = require('path');

const uploadsDir = './uploads';
const files = fs.readdirSync(uploadsDir);

console.log('Files in uploads directory:');
files.forEach(file => {
  const filePath = path.join(uploadsDir, file);
  const stats = fs.statSync(filePath);
  if (stats.isFile()) {
    const uploadTime = stats.mtime.toISOString();
    console.log(`${file}: ${stats.size} bytes, modified: ${uploadTime}`);
  }
});

// Check for files around 90760 bytes (insurance document size)
const targetSize = 90760;
const tolerance = 1000; // Allow 1KB tolerance

const matches = files.filter(file => {
  const filePath = path.join(uploadsDir, file);
  const stats = fs.statSync(filePath);
  return Math.abs(stats.size - targetSize) < tolerance;
});

console.log('\nFiles matching insurance document size (~90760 bytes):');
matches.forEach(file => {
  const filePath = path.join(uploadsDir, file);
  const stats = fs.statSync(filePath);
  console.log(`${file}: ${stats.size} bytes`);
});