import puppeteer from 'puppeteer';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import sharp from 'sharp'
import 'dotenv/config'
import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";
import * as nodefs from "node:fs";
import { fromPath } from "pdf2pic";
import FormData from 'form-data'

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });


class SimpleWireframeComparison {
  constructor(config) {
    this.zeplinToken = config.zeplinToken || process.env.ZEPLIN_TOKEN;
    this.projectId = config.projectId || process.env.ZEPLIN_PROJECT_ID;
    this.outputDir = config.outputDir || './comparison-results';
    this.browser = null;
    this.baseUrl = 'https://api.zeplin.dev/v1';
  }

  async initialize() {
    // Create output directory
    await fs.mkdir(this.outputDir, { recursive: true });
    await fs.mkdir(path.join(this.outputDir, 'wireframes'), { recursive: true });
    await fs.mkdir(path.join(this.outputDir, 'screenshots'), { recursive: true });

    // Launch browser
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    console.log('Initialization complete');
  }

  async convertPdfToPng(pdfPath, outputImagePath, viewport, pageNumber) {
    try {
      const outputBase = path.basename(outputImagePath, ".png");
      const converter = fromPath(pdfPath, {
        density: 150,
        saveFilename: outputBase,
        savePath: path.dirname(outputImagePath),
        format: "png",
        width: viewport.width,
        height: viewport.height,
      });
  
      const result = await converter(pageNumber);
      console.log(`Converted PDF to PNG: ${result.path}`);
      
      return {
        filepath: result.path,
        filename: path.basename(result.path),
      };
    } catch (error) {
      console.error("Error converting PDF to PNG:", error.message);
      throw error;
    }
  }
  

  async compareImages(imgPath1, imgPath2, outputPath) {
    try {
      const img1Buffer = await fs.readFile(imgPath1);
      const img2Buffer = await fs.readFile(imgPath2);
      const img1 = PNG.sync.read(img1Buffer);
      const img2 = PNG.sync.read(img2Buffer);
      
      // Convert image buffers to base64 strings
    const img1Base64 = img1Buffer.toString('base64');
    const img2Base64 = img2Buffer.toString('base64');

    // Step 1: Send base64 image data to Flask server
    const form = new FormData();
    form.append('wireframe', img1Buffer, { filename: 'wireframe.png', contentType: 'image/png' });
    form.append('webpage', img2Buffer, { filename: 'webpage.png', contentType: 'image/png' });

    // Send to Flask
    const response = await axios.post('http://localhost:5000/compare-wireframe-webpage', form, {
      headers: form.getHeaders(),
      // timeout: 20000,
    });

    console.log("Flask analysis result:");
    console.log(response.data.comparison_results);


      // // Upload the first image
      // const uploadedFile = await ai.files.upload({
      //   file: imgPath1,
      //   config: { mimeType: "image/jpeg" },
      // });

      // // Prepare the second image as inline data
      // const base64Image2File = nodefs.readFileSync(imgPath2, {
      //   encoding: "base64",
      // });

      // Create the prompt with text and multiple images

      // const response = await ai.models.generateContent({

      //   model: "gemini-2.5-flash",
      //   contents: createUserContent([
      //     "One of the images is a wireframe and the other is the actual webpage. You need to tell me whether the webpage design matches the wireframe or not. If not, what all does it miss",
      //     createPartFromUri(uploadedFile.uri, uploadedFile.mimeType),
      //     {
      //       inlineData: {
      //         mimeType: "image/png",
      //         data: base64Image2File,
      //       },
      //     },
      //   ]),
      // });
      // console.log("AI analysis:");
      // console.log(response.text);

      const { width, height } = img1;
      const diff = new PNG({ width, height });
  
      const diffPixels = pixelmatch(
        img1.data, img2.data, diff.data, width, height,
        { threshold: 0.1 } 
      );
  
      await fs.writeFile(outputPath, PNG.sync.write(diff));
      return { diffPixels, diffPath: outputPath };
    } catch (err) {
      console.error('Error comparing images:', err.message);
      return { diffPixels: -1, error: err.message };
    }
  }

  async getZeplinScreens() {
    try {
      const response = await axios.get(`${this.baseUrl}/projects/${this.projectId}/screens`, {
        headers: {
          'Authorization': `Bearer ${this.zeplinToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`Found ${response.data.length} screens in Zeplin`);
      return response.data;
    } catch (error) {
      console.error('Error fetching Zeplin screens:', error.message);
      throw error;
    }
  }

  async downloadWireframe(screen, viewport) {
    try {
      const imageResponse = await axios.get(screen.image.original_url, {
        responseType: 'arraybuffer',
        headers: {
          'Authorization': `Bearer ${this.zeplinToken}`
        }
      });
  
      const filename = `${screen.name.replace(/[^a-z0-9]/gi, '_')}_${screen.id}.png`;
      const filepath = path.join(this.outputDir, 'wireframes', filename);
      
      // Resize the image using sharp before saving
      const resizedImageBuffer = await sharp(imageResponse.data)
        .resize(viewport.width, viewport.height, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .toBuffer();
  
      await fs.writeFile(filepath, resizedImageBuffer);
      console.log(`Downloaded and resized wireframe: ${filename}`);
      
      return {
        filepath,
        filename,
        screen
      };
    } catch (error) {
      console.error(`Error downloading wireframe for ${screen.name}:`, error.message);
      throw error;
    }
  }

  // Helper function to replace waitForTimeout
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async captureWebPage(url, screenName, viewport = { width: 1200, height: 800 }) {
    const page = await this.browser.newPage();
    
    try {
      await page.setViewport(viewport);
      
      // Set longer timeout and better error handling
      await page.goto(url, { 
        waitUntil: 'networkidle2', 
        timeout: 60000 
      });
      
      // Replace page.waitForTimeout with our delay function
      await this.delay(3000);
      
      const filename = `${screenName.replace(/[^a-z0-9]/gi, '_')}_webpage.png`;
      const filepath = path.join(this.outputDir, 'screenshots', filename);
      
      await page.screenshot({
        path: filepath,
        fullPage: true,
        type: 'png',
      });
      
      console.log(`Captured webpage screenshot: ${filename}`);
      return {
        filepath,
        filename,
        url,
        viewport
      };
    } catch (error) {
      console.error(`Error capturing webpage ${url}:`, error.message);
      throw error;
    } finally {
      await page.close();
    }
  }

  async compareScreenToUrl(screenName, webUrl, viewport, pdfPath, pageNumber) {
    try {
      console.log(`Comparing "${screenName}" with ${webUrl}`);
      
      const [wireframeResult, webpageResult] = await Promise.all([
        this.convertPdfToPng(pdfPath, path.join(this.outputDir, 'wireframes', `${screenName}_wireframe.png`), viewport, pageNumber),
        this.captureWebPage(webUrl, screenName, viewport)
      ]);
  
      const diffFilename = `${screenName.replace(/[^a-z0-9]/gi, '_')}_diff.png`;
      const diffPath = path.join(this.outputDir, 'screenshots', diffFilename);
  
      const diffResult = await this.compareImages(wireframeResult.filepath, webpageResult.filepath, diffPath);
  
      return {
        screenName,
        wireframe: wireframeResult,
        webpage: webpageResult,
        diff: diffResult,
        status: diffResult.diffPixels >= 0 ? 'completed' : 'failed'
      };
    } catch (error) {
      console.error(`Error comparing ${screenName} to ${webUrl}:`, error.message);
      return {
        screenName,
        error: error.message,
        status: 'failed'
      };
    }
  }
  
  async runBatchComparison(comparisons) {
    const results = [];
    
    console.log(`Starting batch comparison of ${comparisons.length} screens...`);
    
    for (let i = 0; i < comparisons.length; i++) {
      const comparison = comparisons[i];
      console.log(`\n[${i + 1}/${comparisons.length}] Processing: ${comparison.screenName}`);
      
      try {
        const result = await this.compareScreenToUrl(
          comparison.screenName,
          comparison.webUrl,
          comparison.viewport,
          comparison.pdfPath,
          comparison.pageNumber
        );
        results.push(result);
      } catch (error) {
        console.error(`Failed to compare ${comparison.screenName}:`, error.message);
        results.push({
          screenName: comparison.screenName,
          error: error.message,
          status: 'failed'
        });
      }
      
      // Add delay between requests to avoid rate limiting
      if (i < comparisons.length - 1) {
        await this.delay(1000);
      }
    }
    
    return results;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('Browser closed');
    }
  }
}

export {SimpleWireframeComparison};

// Example usage with error handling
async function runComparison() {
  const tool = new SimpleWireframeComparison({
    zeplinToken: process.env.ZEPLIN_TOKEN,
    projectId: process.env.ZEPLIN_PROJECT_ID,
    outputDir: './comparison-results'
  });

  try {
    await tool.initialize();
    
    const comparisons = [
      {
        screenName: 'Desktop - 1',
        webUrl: 'http://localhost:5173/',
        viewport: { width: 1920, height: 1080 },
        pdfPath: './zeplin-wireframes/Desktop-1.pdf',
        pageNumber: 1
      },
    ];
    
    
    console.log('Starting comparison process...');
    const results = await tool.runBatchComparison(comparisons);
    
    const completed = results.filter(r => r.status === 'completed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    
    console.log(`\nProcess completed!`);
    console.log(`   Successful: ${completed}`);
    console.log(`   Failed: ${failed}`);
    
    if (failed > 0) {
      console.log('\nFailed comparisons:');
      results.filter(r => r.status === 'failed').forEach(r => {
        console.log(`   - ${r.screenName}: ${r.error}`);
      });
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await tool.cleanup();
  }
}

// Uncomment to run the example
runComparison();