/**
 * Convert bytes to human-readable format
 * @param {number} bytes - Number of bytes
 * @param {number} decimals - Number of decimal places
 * @returns {string} Human-readable file size
 */
export const formatFileSize = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Validate file type
 * @param {File} file - File object
 * @param {Array} allowedTypes - Array of allowed MIME types
 * @returns {boolean} Whether file type is allowed
 */
export const validateFileType = (file, allowedTypes) => {
  // Check MIME type
  if (allowedTypes.includes(file.type)) {
    return true;
  }

  // Fallback to extension check for some browsers
  const extension = file.name.split('.').pop().toLowerCase();
  const allowedExtensions = allowedTypes.map((type) => {
    const parts = type.split('/');
    return parts[parts.length - 1];
  });

  return allowedExtensions.includes(extension);
};

/**
 * Read text file
 * @param {File} file - File object
 * @returns {Promise<string>} File contents as string
 */
export const readTextFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      resolve(event.target.result);
    };

    reader.onerror = (error) => {
      reject(error);
    };

    reader.readAsText(file);
  });
};

/**
 * Download blob as file
 * @param {Blob} blob - Blob data
 * @param {string} filename - Filename
 */
export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;

  document.body.appendChild(a);
  a.click();

  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};
