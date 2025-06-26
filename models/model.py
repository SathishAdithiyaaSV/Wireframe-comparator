from flask import Flask, request, jsonify
import base64
import io
from PIL import Image
import requests
import json
import os
from typing import Dict, List, Any

app = Flask(__name__)

class ImageComparisonService:
    def __init__(self):
        self.ollama_url = "http://localhost:11434/api/generate"  # Ollama with LLaVA
        
    def encode_image_to_base64(self, image_file) -> str:
        """Convert image file to base64 string"""
        if hasattr(image_file, 'read'):
            image_data = image_file.read()
        else:
            with open(image_file, 'rb') as f:
                image_data = f.read()
        
        return base64.b64encode(image_data).decode('utf-8')
    
    def analyze_with_ollama_llava(self, wireframe_b64: str, webpage_b64: str) -> Dict[str, Any]:
        """Analyze images using Ollama LLaVA model"""
        try:
            prompt = """
            I have two images:
            1. A wireframe design (first image)
            2. A webpage implementation (second image)
            
            Please analyze both images and provide a detailed comparison in JSON format with the following structure:
            {
                "wireframe_elements": ["list of UI elements/components identified in wireframe"],
                "webpage_elements": ["list of UI elements/components identified in webpage"],
                "implemented_elements": ["elements from wireframe that are clearly implemented in webpage"],
                "missing_elements": ["elements from wireframe that are missing in webpage"],
                "additional_elements": ["elements in webpage that weren't in wireframe"],
                "layout_differences": ["differences in layout, positioning, styling"],
                "overall_similarity_score": "score from 0-100 indicating how well wireframe was implemented",
                "implementation_status": "summary of implementation completeness"
            }
            
            Focus on identifying UI components like headers, navigation, buttons, forms, content sections, sidebars, footers, etc.
            """
            print("Reaches10")
            payload = {
                "model": "llava:7b-v1.6",
                "prompt": prompt,
                "images": [wireframe_b64, webpage_b64],
                "stream": False
            }
            print("Reaches11")
            
            response = requests.post(self.ollama_url, json=payload, timeout=300)
            print("Reaches12")
            
            if response.status_code == 200:
                result = response.json()
                print(result)
                return {"success": True, "analysis": result.get("response", "")}
            else:
                return {"success": False, "error": f"Ollama API error: {response.status_code}"}
                
        except Exception as e:
            return {"success": False, "error": f"Ollama analysis failed: {str(e)}"}
    
    
    def parse_analysis_response(self, analysis_text: str) -> Dict[str, Any]:
        """Parse AI response and extract structured data"""
        try:
            # Try to extract JSON from the response
            import re
            json_match = re.search(r'\{.*\}', analysis_text, re.DOTALL)
            if json_match:
                json_str = json_match.group()
                return json.loads(json_str)
            else:
                # If no JSON found, create structured response from text
                return {
                    "wireframe_elements": [],
                    "webpage_elements": [],
                    "implemented_elements": [],
                    "missing_elements": [],
                    "additional_elements": [],
                    "layout_differences": [],
                    "overall_similarity_score": "N/A",
                    "implementation_status": analysis_text[:500] + "..." if len(analysis_text) > 500 else analysis_text
                }
        except json.JSONDecodeError:
            return {
                "error": "Failed to parse AI response",
                "raw_response": analysis_text
            }

comparison_service = ImageComparisonService()

@app.route('/compare-wireframe-webpage', methods=['POST'])
def compare_wireframe_webpage():
    """
    API endpoint to compare wireframe and webpage images
    
    Expected form data:
    - wireframe: image file (PNG/JPG)
    - webpage: image file (PNG/JPG)
    - model: optional, 'ollama' or 'openai' (default: ollama)
    """
    try:
        # Validate request

        if 'wireframe' not in request.files or 'webpage' not in request.files:
            return jsonify({
                "error": "Both 'wireframe' and 'webpage' image files are required"
            }), 400
        
        wireframe_file = request.files['wireframe']
        webpage_file = request.files['webpage']
        
        # Validate file types
        allowed_extensions = {'png', 'jpg', 'jpeg'}
        for file, name in [(wireframe_file, 'wireframe'), (webpage_file, 'webpage')]:
            if not file.filename or '.' not in file.filename:
                return jsonify({"error": f"Invalid {name} file"}), 400
            
            ext = file.filename.rsplit('.', 1)[1].lower()
            if ext not in allowed_extensions:
                return jsonify({
                    "error": f"Unsupported file type for {name}. Use PNG, JPG, or JPEG"
                }), 400
        
        # Convert images to base64
        wireframe_b64 = comparison_service.encode_image_to_base64(wireframe_file)
        webpage_b64 = comparison_service.encode_image_to_base64(webpage_file)


        # default to ollama
        analysis_result = comparison_service.analyze_with_ollama_llava(
            wireframe_b64, webpage_b64
        )

        
        if not analysis_result["success"]:
            return jsonify({
                "error": analysis_result["error"]
            }), 500
        
        
        # # Parse the analysis response
        structured_analysis = comparison_service.parse_analysis_response(
            analysis_result["analysis"]
        )
        
        return jsonify({
            "success": True,
            "comparison_results": structured_analysis,
        })
        
    except Exception as e:
        return jsonify({
            "error": f"Server error: {str(e)}"
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)