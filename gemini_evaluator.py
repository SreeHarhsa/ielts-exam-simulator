import os
import json
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set up the Flask app
app = Flask(__name__, static_folder=".")
CORS(app)

# Configure Gemini AI
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-1.5-pro')

# Serve static files
@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

# Evaluate IELTS responses using Gemini AI
@app.route('/api/gemini-evaluate', methods=['POST'])
def evaluate():
    data = request.json
    text = data.get('text', '')
    evaluation_type = data.get('type', '')  # listening, reading, writing, or speaking
    
    if not text or not evaluation_type:
        return jsonify({"error": "Missing text or evaluation type"}), 400
    
    try:
        # Generate prompts based on the evaluation type
        prompt = generate_evaluation_prompt(text, evaluation_type)
        
        # Get response from Gemini
        response = model.generate_content(prompt)
        evaluation = parse_gemini_response(response.text)
        
        return jsonify(evaluation)
    except Exception as e:
        print(f"Error evaluating with Gemini: {e}")
        return jsonify({"error": str(e)}), 500

def generate_evaluation_prompt(text, evaluation_type):
    """Generate appropriate prompts for different IELTS test components"""
    
    if evaluation_type == 'writing-task1':
        return f"""
        As an IELTS examiner, evaluate the following Task 1 writing response based on the official IELTS Writing Task 1 assessment criteria:
        
        1. Task Achievement (Have they addressed all parts of the task with appropriate and accurate information?)
        2. Coherence and Cohesion (Is the response well-organized with appropriate linking words?)
        3. Lexical Resource (Is there a wide range of vocabulary used accurately and appropriately?)
        4. Grammatical Range and Accuracy (Is there a wide range of grammatical structures used with accuracy?)
        
        For each criterion, provide a band score from 0 to 9 (can use .5 increments) and specific feedback.
        
        Also provide an overall band score and suggestions for improvement.
        
        Format your response as JSON with the following structure:
        {{
            "bandScore": "overall score",
            "criteria": {{
                "taskAchievement": "score",
                "coherence": "score",
                "lexicalResource": "score",
                "grammar": "score"
            }},
            "feedback": {{
                "taskAchievement": "feedback",
                "coherence": "feedback",
                "lexicalResource": "feedback",
                "grammar": "feedback",
                "overall": "overall feedback",
                "improvements": ["suggestion1", "suggestion2", "suggestion3"]
            }}
        }}
        
        Task 1 Response:
        {text}
        """
    
    elif evaluation_type == 'writing-task2':
        return f"""
        As an IELTS examiner, evaluate the following Task 2 essay based on the official IELTS Writing Task 2 assessment criteria:
        
        1. Task Response (Have they addressed all parts of the task with a clear position throughout?)
        2. Coherence and Cohesion (Is the essay well-organized with appropriate paragraphing and linking words?)
        3. Lexical Resource (Is there a wide range of vocabulary used accurately and appropriately?)
        4. Grammatical Range and Accuracy (Is there a wide range of grammatical structures used with accuracy?)
        
        For each criterion, provide a band score from 0 to 9 (can use .5 increments) and specific feedback.
        
        Also provide an overall band score and suggestions for improvement.
        
        Format your response as JSON with the following structure:
        {{
            "bandScore": "overall score",
            "criteria": {{
                "taskResponse": "score",
                "coherence": "score",
                "lexicalResource": "score",
                "grammar": "score"
            }},
            "feedback": {{
                "taskResponse": "feedback",
                "coherence": "feedback",
                "lexicalResource": "feedback",
                "grammar": "feedback",
                "overall": "overall feedback",
                "improvements": ["suggestion1", "suggestion2", "suggestion3"]
            }}
        }}
        
        Task 2 Essay:
        {text}
        """
    
    elif evaluation_type.startswith('speaking'):
        return f"""
        As an IELTS examiner, evaluate the following speaking response based on the official IELTS Speaking assessment criteria:
        
        1. Fluency and Coherence (Does the candidate speak at length without noticeable effort and use cohesive devices effectively?)
        2. Lexical Resource (Is there a wide range of vocabulary used accurately and appropriately?)
        3. Grammatical Range and Accuracy (Is there a wide range of grammatical structures used with accuracy?)
        4. Pronunciation (Is pronunciation clear with appropriate use of intonation and stress?)
        
        For each criterion, provide a band score from 0 to 9 (can use .5 increments) and specific feedback.
        
        Also provide an overall band score and suggestions for improvement.
        
        Format your response as JSON with the following structure:
        {{
            "bandScore": "overall score",
            "criteria": {{
                "fluency": "score",
                "vocabulary": "score",
                "grammar": "score",
                "pronunciation": "score"
            }},
            "feedback": {{
                "fluency": "feedback",
                "vocabulary": "feedback",
                "grammar": "feedback",
                "pronunciation": "feedback",
                "overall": "overall feedback",
                "improvements": ["suggestion1", "suggestion2", "suggestion3"]
            }}
        }}
        
        Speaking Response Transcript:
        {text}
        """
    
    elif evaluation_type == 'listening' or evaluation_type == 'reading':
        # For listening and reading, we would typically check against correct answers
        # This is a simplified version for demonstration
        return f"""
        Analyze the following IELTS {evaluation_type} responses and provide constructive feedback.
        
        Provide an estimated band score from 0-9 (can use .5 increments) based on the quality and accuracy of the responses.
        
        Format your response as JSON with the following structure:
        {{
            "bandScore": "overall score",
            "feedback": "detailed feedback",
            "improvements": ["suggestion1", "suggestion2", "suggestion3"]
        }}
        
        {evaluation_type.capitalize()} Responses:
        {text}
        """
    
    else:
        return f"""
        Analyze the following IELTS response and provide constructive feedback with an estimated band score from 0-9.
        
        Format your response as JSON with the following structure:
        {{
            "bandScore": "overall score",
            "feedback": "detailed feedback",
            "improvements": ["suggestion1", "suggestion2", "suggestion3"]
        }}
        
        Response:
        {text}
        """

def parse_gemini_response(response_text):
    """Parse the JSON response from Gemini"""
    try:
        # Extract JSON from the response (in case there's any extra text)
        start_idx = response_text.find('{')
        end_idx = response_text.rfind('}') + 1
        json_str = response_text[start_idx:end_idx]
        
        # Parse the JSON
        evaluation = json.loads(json_str)
        return evaluation
    except Exception as e:
        print(f"Error parsing Gemini response: {e}")
        print(f"Original response: {response_text}")
        
        # Return a default evaluation if parsing fails
        return {
            "bandScore": "6.0",
            "feedback": "Unable to parse evaluation. Please try again.",
            "error": str(e),
            "original_response": response_text
        }

if __name__ == '__main__':
    app.run(debug=True, port=5000)