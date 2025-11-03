from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
CORS(app)

MONGO_URI = os.getenv('MONGO_URI')
client = MongoClient(MONGO_URI)
db = client['hardware_db']
users = db['users']
hardware_collection = db["hardware_sets"]
projects_collection = db["projects"]

def initialize_hardware_sets():
    for name, cap in (("HWSet1", 100), ("HWSet2", 100)):
        hardware_collection.update_one(
            {"name": name},
            {
                "$setOnInsert": {"capacity": cap, "available": cap}
            },
            upsert=True,
        )

initialize_hardware_sets()

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
    
@app.route('/hardware', methods=['GET'])
def get_hardware_sets():
    sets = list(hardware_collection.find({}, {"_id": 0}))
    return jsonify(sets), 200

@app.route('/hardware/checkout', methods=['POST'])
def checkout_hardware():
    data = request.get_json() or {}
    name = data.get('name')
    amount = int(data.get('amount', 0))
    project_id = data.get('project_id')

    if not name or amount <= 0:
        return jsonify({"success": False, "message": "Provide name and positive amount"}), 400

    updated = hardware_collection.find_one_and_update(
        {"name": name, "available": {"$gte": amount}},
        {"$inc": {"available": -amount}},
        projection={"_id": 0},
        return_document=True
    )

    if not updated:
        exists = hardware_collection.find_one({"name": name})
        if not exists:
            return jsonify({"success": False, "message": "Hardware set not found"}), 404
        return jsonify({"success": False, "message": "Not enough hardware available"}), 400

    if project_id:
        projects_collection.update_one(
            {"project_id": project_id},
            {"$inc": {f"hardware_usage.{name}": amount}}
        )

    return jsonify({
        "success": True,
        "message": f"Checked out {amount} from {name}",
        "hardware": updated
    }), 200

@app.route('/hardware/checkin', methods=['POST'])
def checkin_hardware():
    data = request.get_json() or {}
    name = data.get('name')
    amount = int(data.get('amount', 0))
    project_id = data.get('project_id')

    if not name or amount <= 0:
        return jsonify({"success": False, "message": "Provide name and positive amount"}), 400

    hwset = hardware_collection.find_one({'name': name})
    if not hwset:
        return jsonify({'success': False, 'message': 'Hardware set not found'}), 404

    if hwset['available'] + amount > hwset['capacity']:
        return jsonify({'success': False, 'message': 'Cannot exceed hardware capacity'}), 400

    hardware_collection.update_one({'name': name}, {'$inc': {'available': amount}})
    updated = hardware_collection.find_one({'name': name}, {'_id': 0})

    if project_id:
        project = projects_collection.find_one({'project_id': project_id})
        if not project:
            return jsonify({'success': False, 'message': 'Project not found'}), 404

        current_usage = project['hardware_usage'].get(name, 0)
        if current_usage < amount:
            return jsonify({
                'success': False,
                'message': f'Project has only {current_usage} units checked out from {name}'
            }), 400

        projects_collection.update_one(
            {'project_id': project_id},
            {'$inc': {f"hardware_usage.{name}": -amount}}
        )

    return jsonify({
        'success': True,
        'message': f'Checked in {amount} units to {name}',
        'hardware': updated
    }), 200

@app.route('/projects', methods=['POST'])
def create_project():
    data = request.get_json() or {}
    username = data.get('username')
    project_id = data.get('project_id')
    project_name = data.get('project_name')

    if not all([username, project_id, project_name]):
        return jsonify({"success": False, "message": "Missing required fields"}), 400

    if projects_collection.find_one({"project_id": project_id}):
        return jsonify({"success": False, "message": "Project ID already exists"}), 400

    new_project = {
        "project_id": project_id,
        "project_name": project_name,
        "username": username,
        "hardware_usage": {"HWSet1": 0, "HWSet2": 0}
    }
    projects_collection.insert_one(new_project)
    return jsonify({"success": True, "message": f"Project '{project_name}' created successfully."}), 201


@app.route('/projects/<username>', methods=['GET'])
def get_projects(username):
    projects = list(projects_collection.find({"username": username}, {"_id": 0}))
    return jsonify(projects), 200

if __name__ == '__main__':
    app.run(debug=True)