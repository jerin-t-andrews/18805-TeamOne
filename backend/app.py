from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

MONGO_URI = os.getenv('MONGO_URI')
client = MongoClient(MONGO_URI)
db = client['hardware_db']
users = db['users']

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'message': 'Username and password required', 'success': False}), 400

    if users.find_one({'username': username}):
        return jsonify({'message': 'Username already exists', 'success': False}), 400

    users.insert_one({'username': username, 'password': password})
    return jsonify({'message': 'User created successfully', 'success': True}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = users.find_one({'username': username})
    if username and password:
        if user and user.get('password') == password:
            return jsonify({'message': 'Login successful', 'success': True})
        return jsonify({'message': 'Invalid username or password', 'success': False}), 401

if __name__ == '__main__':
    app.run(debug=True)