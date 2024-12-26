from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from PyPDF2 import PdfReader
import os
import torch
import re

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Load model and tokenizer
MODEL_DIR = "./model_directory"
tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_DIR, trust_remote_code=True)
device = "cuda" if torch.cuda.is_available() else "cpu"
model.to(device)

# Function to clean text
def clean_text(text):
    """
    Cleans text by removing unwanted characters, symbols, and URLs.
    """
    text = re.sub(r'[^\x00-\x7F]+', ' ', text)  # Remove non-ASCII characters
    text = re.sub(r'\s+', ' ', text)  # Replace multiple spaces/newlines with a single space
    text = re.sub(r'https?://\S+|www\.\S+', '', text)  # Remove URLs
    text = re.sub(r'[^\w\s\!\?\.\,\'\:\-]', '', text)  # Remove unwanted symbols
    return text.strip()

# Function to calculate extended summary lengths
def calc_summary_lengths(text_length):
    """
    Calculates extended summary length ranges based on the text length.
    Each category (Short, Medium, Long) builds upon the previous one.
    """
    short_min = int(0.15 * text_length)
    short_max = int(0.35 * text_length)
    medium_min = short_max
    medium_max = int(0.50 * text_length)
    long_min = medium_max
    long_max = int(0.70 * text_length)

    return {
        "Short": (short_min, short_max),
        "Medium": (medium_min, medium_max),
        "Long": (long_min, long_max)
    }

# Route to summarize text from PDF
@app.route("/summarize", methods=["POST"])
def summarize():
    """
    Handles the /summarize route to generate summaries of text extracted from a PDF.
    """
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    # Get the summary length from the request form
    summary_length = request.form.get("length", "Short").capitalize()
    file = request.files["file"]

    try:
        # Extract text from the uploaded PDF
        text = ""
        reader = PdfReader(file)
        for page in reader.pages:
            text += page.extract_text()

        # Clean the extracted text
        text = clean_text(text)
        text_length = len(text.split())
        summary_range = calc_summary_lengths(text_length)

        if summary_length not in summary_range:
            return jsonify({"error": "Invalid summary length"}), 400

        min_length, max_length = summary_range[summary_length]

        # Tokenize and generate the summary
        inputs = tokenizer.encode(
            text, max_length=1024, return_tensors="pt", truncation=True
        ).to(device)

        summary_ids = model.generate(
            inputs,
            num_beams=4,
            min_length=min_length,
            max_length=max_length,
            early_stopping=True,
        )

        summary = tokenizer.decode(summary_ids[0], skip_special_tokens=True)
        return jsonify({"summary": summary})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
