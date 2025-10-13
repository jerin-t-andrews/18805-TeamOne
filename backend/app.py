from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    # TODO: Process username and password and interact with db
    # For now, just return a simple response
    if username and password:
        return jsonify({'message': f'Welcome {username}', 'success': True})
    else:
        return jsonify({'message': 'Username and password required', 'success': False}), 400

if __name__ == '__main__':
    app.run(debug=True)