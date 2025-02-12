// Utility function to convert YAML pipeline data to Mermaid syntax
function generateMermaidDiagram(data) {
  // Initialize with the flowchart declaration (no extra spaces)
  let diagram = 'flowchart TD\n';
  const stages = data.stages || [];
  const jobs = data.jobs || {};

  // Create nodes for each job without any leading space
  for (let jobName in jobs) {
    const job = jobs[jobName];
    diagram += `${jobName}[${jobName} (${job.stage})]\n`;
  }

  // Create dependency links if 'needs' are specified (remove spaces around arrow)
  for (let jobName in jobs) {
    const job = jobs[jobName];
    if (job.needs) {
      // Ensure job.needs is an array
      if (!Array.isArray(job.needs)) {
        job.needs = [job.needs];
      }
      job.needs.forEach(dep => {
        diagram += `${dep}-->${jobName}\n`;
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
      const nextStage = stages[i + 1];
      const currentJobs = stageToJobs[currentStage] || [];
      const nextJobs = stageToJobs[nextStage] || [];
      currentJobs.forEach(cj => {
        nextJobs.forEach(nj => {
          diagram += `${cj}-->${nj}\n`;
        });
      });
    }
  }
  return diagram;
}

