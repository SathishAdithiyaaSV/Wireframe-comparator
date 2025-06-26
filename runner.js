import { SimpleWireframeComparison } from './simple-comparison.js'

const tool = new SimpleWireframeComparison({
  outputDir: './comparison-results'
});

await tool.initialize();

const result = await tool.compareScreenToUrl(
  'Desktop-1',
  'http://localhost:5173/',
  { width: 1920, height: 1080 },
  './zeplin-wireframes/Desktop-1.pdf'
);

await tool.cleanup();