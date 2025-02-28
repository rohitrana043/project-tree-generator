const fs = require('fs');
const path = require('path');

// Directories to create
const directories = [
  './server/tmp',
  './server/tmp/uploads',
  './server/tmp/extracted',
  './server/tmp/structures',
];

// Create directories
directories.forEach((dir) => {
  const dirPath = path.resolve(dir);

  if (!fs.existsSync(dirPath)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dirPath, { recursive: true });

    // Create .gitkeep file to keep directory in git
    fs.writeFileSync(path.join(dirPath, '.gitkeep'), '');
  } else {
    console.log(`Directory already exists: ${dir}`);
  }
});

console.log('Setup completed successfully!');
