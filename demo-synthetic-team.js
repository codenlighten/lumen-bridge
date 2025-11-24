#!/usr/bin/env node

/**
 * Demo: Synthetic Dev Team
 * 
 * Shows the complete workflow:
 * 1. User provides project spec
 * 2. ProjectPlannerAgent creates contract + boxes
 * 3. Multiple CodeWorkerAgents execute in parallel
 * 4. IntegrationAgent verifies alignment
 * 5. Final deliverable assembled
 * 
 * This is the "morning standup → end of day" flow.
 */

import SyntheticDevTeam from './utilities/SyntheticDevTeam.js';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('\n' + '█'.repeat(80));
  console.log('█                    SYNTHETIC DEV TEAM DEMO                            █');
  console.log('█'.repeat(80));
  console.log('\nThis demo shows a synthetic dev team building a real project:\n');
  console.log('  👨‍💼 Product Owner: You (provides spec)');
  console.log('  🏗️  Architect: ProjectPlannerAgent (creates contract + boxes)');
  console.log('  👨‍💻 Developers: N × CodeWorkerAgents (work in parallel)');
  console.log('  🔗 Tech Lead: IntegrationAgent (verifies alignment)');
  console.log('  📦 CTO: SyntheticDevTeam (orchestrates everything)');

  // Create the team
  const team = new SyntheticDevTeam();

  // Example 1: Build a simple REST API
  console.log('\n' + '='.repeat(80));
  console.log('EXAMPLE 1: REST API for Todo App');
  console.log('='.repeat(80));

  const projectSpec = `
Build a production-ready Node.js REST API using:
- ES6 modules (import/export)
- Express.js web framework
- Node.js 20+ runtime
- In-memory data store (no database)
- Jest for testing with 80% coverage required
- ESLint + Prettier for code quality
- npm as package manager
- RESTful best practices
  `.trim();

  const featureSpec = `
Create a Todo API with the following endpoints:

1. GET /api/todos - List all todos
2. GET /api/todos/:id - Get single todo
3. POST /api/todos - Create todo (body: {title, description})
4. PUT /api/todos/:id - Update todo
5. DELETE /api/todos/:id - Delete todo

Requirements:
- Input validation (title required, max 200 chars)
- Proper HTTP status codes (200, 201, 400, 404, 500)
- Error handling middleware
- Request logging
- CORS enabled
- Each endpoint fully tested
  `.trim();

  try {
    // Run the synthetic dev team
    const deliverable = await team.buildProject({
      projectSpec,
      featureSpec
    });

    // Save the results
    const outputDir = './synthetic-team-output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write each file
    console.log('\n' + '='.repeat(80));
    console.log('💾 SAVING DELIVERABLES');
    console.log('='.repeat(80));

    deliverable.files.forEach(file => {
      const filePath = path.join(outputDir, file.path);
      const dir = path.dirname(filePath);
      
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filePath, file.content);
      console.log(`   ✓ Saved: ${file.path}`);
    });

    // Write summary report
    const reportPath = path.join(outputDir, 'BUILD-REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(deliverable, null, 2));
    console.log(`   ✓ Saved: BUILD-REPORT.json`);

    // Print next steps
    console.log('\n' + '='.repeat(80));
    console.log('🎉 SYNTHETIC DEV TEAM COMPLETE!');
    console.log('='.repeat(80));
    console.log(`\nDeliverables saved to: ${outputDir}/`);
    console.log('\nNext steps:');
    console.log(`  cd ${outputDir}`);
    console.log('  npm install');
    console.log('  npm test');
    console.log('  npm start');

    // Show what was built
    console.log('\n' + '='.repeat(80));
    console.log('WHAT WAS BUILT');
    console.log('='.repeat(80));
    
    if (deliverable.deliverables.completedBoxes.length > 0) {
      console.log('\n✅ Completed Components:');
      deliverable.deliverables.completedBoxes.forEach(box => {
        console.log(`   ${box.name}`);
        console.log(`      File: ${box.file}`);
        console.log(`      Lines: ${box.linesOfCode}`);
        console.log(`      Tests: ${box.tests}`);
        console.log(`      Iterations: ${box.iterations}`);
      });
    }

    if (deliverable.deliverables.blockedBoxes.length > 0) {
      console.log('\n⚠️  Blocked Components (need your input):');
      deliverable.deliverables.blockedBoxes.forEach(box => {
        console.log(`   ${box.name}`);
        box.missingContext.forEach(ctx => {
          console.log(`      - ${ctx}`);
        });
      });
    }

    // Integration status
    console.log('\n🔗 Integration Status:');
    if (deliverable.integration.readyForDeployment) {
      console.log('   ✅ Ready for deployment!');
    } else {
      console.log('   ⚠️  Issues need resolution:');
      deliverable.integration.issues.forEach(issue => {
        console.log(`      - ${issue}`);
      });
    }

  } catch (error) {
    console.error('\n❌ Error running synthetic dev team:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the demo
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
