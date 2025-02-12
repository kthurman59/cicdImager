const express = require('express');
const multer = require('multer');
const path = require('path');
const yaml = require('js-yaml');
const fs = require('fs');
const app = express();
const upload = multer({ dest: 'uploads/' });

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Home route: Display file upload form
app.get('/', (req, res) => {
  res.render('index');
});

// Utility function to convert YAML pipeline data to Mermaid syntax
function generateMermaidDiagram(data) {
  // Expects YAML to have a 'stages' array and a 'jobs' object.
  // Example YAML structure:
  // stages:
  //   - build
  //   - test
  //   - deploy
  // jobs:
  //   build:
  //     stage: build
  //   test:
  //     stage: test
  //     needs: [build]
  //   deploy:
  //     stage: deploy
  //     needs: [test]
  //
  // Generate a flowchart in Mermaid syntax.
  let diagram = 'flowchart TD\n';
  const stages = data.stages || [];
  const jobs = data.jobs || {};

  // Create nodes for each job
  for (let jobName in jobs) {
    const job = jobs[jobName];
    diagram += ` ${jobName}[${jobName} (${job.stage})]\n`;
  }

  // Create dependency links if 'needs' are specified
  for (let jobName in jobs) {
    const job = jobs[jobName];
    if (job.needs) {
      // Ensure job.needs is always an array
      if (!Array.isArray(job.needs)) {
        job.needs = [job.needs];
      }
      job.needs.forEach(dep => {
        diagram += ` ${dep} --> ${jobName}\n`;
      });
    }
  }

  // Fallback: If no explicit dependencies, chain jobs by stage order.
  if (Object.keys(jobs).length > 0 && !Object.values(jobs).some(job => job.needs)) {
    let stageToJobs = {};
    for (let jobName in jobs) {
      const job = jobs[jobName];
      if (!stageToJobs[job.stage]) stageToJobs[job.stage] = [];
      stageToJobs[job.stage].push(jobName);
    }
    for (let i = 0; i < stages.length - 1; i++) {
      const currentStage = stages[i];
      const nextStage = stages[i+1];
      const currentJobs = stageToJobs[currentStage] || [];
      const nextJobs = stageToJobs[nextStage] || [];
      currentJobs.forEach(cj => {
        nextJobs.forEach(nj => {
          diagram += ` ${cj} --> ${nj}\n`;
        });
      });
    }
  }
  return diagram;
}

// Upload route: Process the uploaded YAML file 
app.post('/upload', upload.single('pipelineFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  try {
    const fileContent = fs.readFileSync(req.file.path, 'utf8');
    const data = yaml.load(fileContent);
    const mermaidDiagram = generateMermaidDiagram(data);
    // Clean up uploaded file 
    fs.unlinkSync(req.file.path);
    res.render('result', { diagram: mermaidDiagram });
  } catch (err) {
    console.error(err);
    return res.status(500).send('Error processing file.');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

