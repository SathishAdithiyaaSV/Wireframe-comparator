# Wireframe Comparison Tool

A powerful Node.js tool that automatically compares PDF wireframes with live web pages using AI-powered analysis and visual diff generation with offline AI models.

## Features

- 🔍 **Automated Comparison**: Compare PDF wireframes with live web pages
- 🤖 **Offline AI Analysis**: Uses local Ollama LLaVA model for privacy-focused analysis
- 📄 **PDF Support**: Converts PDF wireframes to images for comparison
- 📸 **Screenshot Generation**: Captures full-page screenshots with Puppeteer
- 🖼️ **Visual Diff**: Generates pixel-perfect difference images
- 📊 **Batch Processing**: Compare multiple screens in one run
- 🎯 **Viewport Control**: Customizable viewport sizes for responsive testing
- 🏠 **Local Processing**: All AI analysis runs locally without external API calls

## Prerequisites

- Node.js (v16 or higher)
- Chrome/Chromium browser (for Puppeteer)
- [Ollama](https://ollama.ai/) installed locally
- LLaVA model downloaded in Ollama

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Wireframe-comparator
```

2. Install dependencies:
```bash
npm install
```

3. Install and setup Ollama:
```bash
# Install Ollama (visit https://ollama.ai/ for installation instructions)
# Then pull the LLaVA model
ollama pull llava:7b-v1.6
```

4. Install Python dependencies for the Flask server:
```bash
pip install flask pillow requests
```

## Usage

### Setup

1. **Start Ollama service** (if not already running):
```bash
ollama serve
```

2. **Start the Flask analysis server**:
```bash
cd models
python3 model.py
```

3. **Run the Node.js comparison tool**:

### Basic Usage

```javascript
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
```

### Batch Comparison

```javascript
const comparisons = [
  {
    screenName: 'Homepage',
    webUrl: 'https://your-website.com',
    viewport: { width: 1920, height: 1080 },
    pdfPath: './zeplin-wireframes/homepage.pdf'
  },
  {
    screenName: 'About Page',
    webUrl: 'https://your-website.com/about',
    viewport: { width: 1200, height: 800 },
    pdfPath: './zeplin-wireframes/about.pdf'
  }
];

const results = await tool.runBatchComparison(comparisons);
```

### Configuration Options

```javascript
const tool = new SimpleWireframeComparison({
  outputDir: './custom-output-dir',        // Optional, defaults to './comparison-results'
});
```

## Architecture

The tool consists of three main components:

1. **Node.js Main Tool** (`simple-comparison.js`):
   - Handles PDF to image conversion
   - Captures webpage screenshots
   - Orchestrates the comparison process
   - Generates visual diffs

2. **Flask Analysis Server** (`model.py`):
   - Provides REST API for AI-powered image analysis
   - Interfaces with local Ollama LLaVA model
   - Returns structured comparison results

3. **Ollama LLaVA Model**:
   - Local AI model for visual analysis
   - Compares wireframes with implementations
   - Identifies missing/additional elements

## Output Structure

The tool generates organized output files:

```
comparison-results/
├── wireframes/
│   ├── Homepage_wireframe.png
│   └── About_Page_wireframe.png
├── screenshots/
│   ├── Homepage_webpage.png
│   ├── About_Page_webpage.png
│   ├── Homepage_diff.png
│   └── About_Page_diff.png
```

## API Reference

### SimpleWireframeComparison

#### Constructor
```javascript
new SimpleWireframeComparison(config)
```

**Parameters:**
- `config.outputDir` (string, optional): Output directory path

#### Methods

##### `initialize()`
Initializes the browser and creates output directories.

##### `compareScreenToUrl(screenName, webUrl, viewport, pdfPath)`
Compares a PDF wireframe with a web page.

**Parameters:**
- `screenName` (string): Name for the comparison
- `webUrl` (string): URL of the web page to compare
- `viewport` (object): Viewport dimensions `{ width, height }`
- `pdfPath` (string): Path to the PDF wireframe file

**Returns:** Comparison result object with AI analysis

##### `runBatchComparison(comparisons)`
Runs multiple comparisons in sequence.

**Parameters:**
- `comparisons` (array): Array of comparison objects

##### `cleanup()`
Closes the browser and cleans up resources.

### Flask API Endpoints

#### `POST /compare-wireframe-webpage`

Compares wireframe and webpage images using AI analysis.

**Form Data:**
- `wireframe`: Image file (PNG/JPG)
- `webpage`: Image file (PNG/JPG)

**Response:**
```json
{
  "success": true,
  "comparison_results": {
    "wireframe_elements": ["list of UI elements in wireframe"],
    "webpage_elements": ["list of UI elements in webpage"],
    "implemented_elements": ["successfully implemented elements"],
    "missing_elements": ["elements missing from implementation"],
    "additional_elements": ["extra elements in webpage"],
    "layout_differences": ["layout and styling differences"],
    "overall_similarity_score": "0-100 similarity score",
    "implementation_status": "summary of implementation"
  }
}
```

## Example Usage

```javascript
// example-usage.js
import { SimpleWireframeComparison } from './simple-comparison.js';

async function runComparison() {
  const tool = new SimpleWireframeComparison({
    outputDir: './comparison-results'
  });

  try {
    await tool.initialize();
    
    const comparisons = [
      {
        screenName: 'Desktop-1',
        webUrl: 'http://localhost:5173/',
        viewport: { width: 1920, height: 1080 },
        pdfPath: './zeplin-wireframes/Desktop-1.pdf'
      },
    ];
    
    console.log('Starting comparison process...');
    const results = await tool.runBatchComparison(comparisons);
    
    const completed = results.filter(r => r.status === 'completed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    
    console.log(`Process completed!`);
    console.log(`   Successful: ${completed}`);
    console.log(`   Failed: ${failed}`);
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await tool.cleanup();
  }
}

runComparison();
```

## AI Analysis Features

The local LLaVA model provides detailed analysis including:

- **Element Detection**: Identifies UI components in both wireframe and webpage
- **Implementation Status**: Tracks which wireframe elements are implemented
- **Missing Elements**: Lists wireframe elements not found in the webpage
- **Additional Elements**: Identifies webpage elements not in the wireframe
- **Layout Analysis**: Compares positioning and styling differences
- **Similarity Scoring**: Provides numerical similarity assessment
- **Privacy-First**: All analysis happens locally without external API calls
