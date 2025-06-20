# Wireframe Comparison Tool

A powerful Node.js tool that automatically compares Zeplin wireframes with live web pages using AI-powered analysis and visual diff generation.

## Features

- 🔍 **Automated Comparison**: Compare Zeplin wireframes with live web pages
- 🤖 **AI Analysis**: Uses Google Gemini AI to analyze design differences
- 📸 **Screenshot Generation**: Captures full-page screenshots with Puppeteer
- 🖼️ **Visual Diff**: Generates pixel-perfect difference images
- 📊 **Batch Processing**: Compare multiple screens in one run
- 🎯 **Viewport Control**: Customizable viewport sizes for responsive testing

## Prerequisites

- Node.js (v16 or higher)
- A Zeplin account with API access
- A Google AI API key (for Gemini)
- Chrome/Chromium browser (for Puppeteer)

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

## Configuration

Create a `.env` file in the root directory:

```env
ZEPLIN_TOKEN=your_zeplin_api_token
ZEPLIN_PROJECT_ID=your_zeplin_project_id
GOOGLE_API_KEY=your_google_gemini_api_key
```

### Getting Your API Keys

**Zeplin API Token:**
1. Go to [Zeplin Developer](https://app.zeplin.io/profile/developer)
2. Generate a new personal access token
3. Copy the token to your `.env` file

**Zeplin Project ID:**
1. Open your Zeplin project
2. Copy the project ID from the URL: `https://app.zeplin.io/project/{PROJECT_ID}`

**Google AI API Key:**
1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Create a new API key
3. Copy the key to your `.env` file

## Usage

### Basic Usage

```javascript
import { SimpleWireframeComparison } from './path/to/simple-comparison.js';

const tool = new SimpleWireframeComparison({
  projectId: 'your-project-id',
  outputDir: './comparison-results'
});

await tool.initialize();

const result = await tool.compareScreenToUrl(
  'Screen Name',
  'https://your-website.com',
  { width: 1920, height: 1080 }
);

await tool.cleanup();
```

### Batch Comparison

```javascript
const comparisons = [
  {
    screenName: 'Homepage',
    webUrl: 'https://your-website.com',
    viewport: { width: 1920, height: 1080 }
  },
  {
    screenName: 'About Page',
    webUrl: 'https://your-website.com/about',
    viewport: { width: 1200, height: 800 }
  }
];

const results = await tool.runBatchComparison(comparisons);
```

### Configuration Options

```javascript
const tool = new SimpleWireframeComparison({
  zeplinToken: 'your-zeplin-token',       // Optional, defaults to process.env.ZEPLIN_TOKEN
  projectId: 'your-zeplin-project-id',    // Optional, defaults to process.env.ZEPLIN_PROJECT_ID
  outputDir: './custom-output-dir',        // Optional, defaults to './comparison-results'
});
```

## Output Structure

The tool generates organized output files:

```
comparison-results/
├── wireframes/
│   ├── Homepage_123456.png
│   └── About_Page_789012.png
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
- `config.zeplinToken` (string, optional): Zeplin token
- `config.projectId` (string, optional): Zeplin project ID
- `config.outputDir` (string, optional): Output directory path

#### Methods

##### `initialize()`
Initializes the browser and creates output directories.

##### `compareScreenToUrl(screenName, webUrl, viewport)`
Compares a single Zeplin screen with a web page.

**Parameters:**
- `screenName` (string): Name of the screen in Zeplin
- `webUrl` (string): URL of the web page to compare
- `viewport` (object): Viewport dimensions `{ width, height }`

**Returns:** Comparison result object

##### `runBatchComparison(comparisons)`
Runs multiple comparisons in sequence.

**Parameters:**
- `comparisons` (array): Array of comparison objects

##### `cleanup()`
Closes the browser and cleans up resources.


## Error Handling

The tool includes comprehensive error handling for:
- Network timeouts
- Invalid URLs
- Missing Zeplin screens
- API rate limiting
- Browser crashes
