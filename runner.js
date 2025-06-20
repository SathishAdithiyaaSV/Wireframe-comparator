import { SimpleWireframeComparison } from './simple-comparison.js';

const tool = new SimpleWireframeComparison({
  projectId: '68525091c948996fe018d8ce',
  outputDir: './comparison-results'
});

await tool.initialize();

const result = await tool.compareScreenToUrl(
  'Desktop - 1',
  'http://localhost:5173/',
  { width: 1920, height: 1080 }
);

await tool.cleanup();